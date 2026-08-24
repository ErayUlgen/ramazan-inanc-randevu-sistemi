import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerAuthPurpose, Prisma } from '@prisma/client';
import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { normalizeTurkishMobile } from '../common/phone';
import { SmsGatewayService } from '../notifications/sms-gateway.service';
import { PrismaService } from '../prisma/prisma.service';

const OTP_LIFETIME_MS = 5 * 60_000;
const RESEND_INTERVAL_MS = 60_000;
const RATE_WINDOW_MS = 15 * 60_000;
const MAX_PHONE_REQUESTS = 5;
const MAX_IP_REQUESTS = 20;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsGatewayService,
  ) {}

  async requestAccountCode(phoneInput: string, ip: string) {
    const phone = normalizeTurkishMobile(phoneInput);
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
    });
    return this.createChallenge({
      phone,
      ip,
      purpose: CustomerAuthPurpose.ACCOUNT_LOGIN,
      customerId: customer?.id,
      shouldSend: Boolean(customer),
    });
  }

  async requestBookingCode(
    bookingId: string,
    phoneInput: string,
    holdToken: string,
    ip: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new BadRequestException('Randevu saati bulunamadı.');
    if (
      booking.status !== 'HOLD' ||
      !booking.holdExpiresAt ||
      booking.holdExpiresAt <= new Date()
    ) {
      throw new ConflictException(
        'Ayırdığımız sürenin sonuna geldik. Lütfen saati yeniden seç.',
      );
    }
    if (
      !booking.holdTokenHash ||
      !this.safeHashEquals(this.hash(holdToken), booking.holdTokenHash)
    ) {
      throw new BadRequestException('Randevu güvenlik anahtarı geçerli değil.');
    }
    const phone = normalizeTurkishMobile(phoneInput);
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
    });
    return this.createChallenge({
      phone,
      ip,
      purpose: CustomerAuthPurpose.BOOKING_CONFIRMATION,
      subjectId: bookingId,
      customerId: customer?.id,
      shouldSend: true,
    });
  }

  async verifyAccountCode(input: {
    phone: string;
    challengeId: string;
    code: string;
  }) {
    const phone = normalizeTurkishMobile(input.phone);
    const challenge = await this.prisma.customerAuthChallenge.findFirst({
      where: {
        id: input.challengeId,
        phoneHash: this.hashSensitive(phone),
        purpose: CustomerAuthPurpose.ACCOUNT_LOGIN,
        consumedAt: null,
      },
    });
    if (!challenge?.customerId) throw this.invalidCode();
    await this.consumeChallenge(this.prisma, challenge, input.code);
    return challenge.customerId;
  }

  async consumeBookingCode(
    transaction: Prisma.TransactionClient,
    input: {
      bookingId: string;
      phone: string;
      challengeId: string;
      code: string;
    },
  ) {
    const phone = normalizeTurkishMobile(input.phone);
    const challenge = await transaction.customerAuthChallenge.findFirst({
      where: {
        id: input.challengeId,
        phoneHash: this.hashSensitive(phone),
        purpose: CustomerAuthPurpose.BOOKING_CONFIRMATION,
        subjectId: input.bookingId,
        consumedAt: null,
      },
    });
    if (!challenge) throw this.invalidCode();
    await this.consumeChallenge(transaction, challenge, input.code);
    return phone;
  }

  private async createChallenge(input: {
    phone: string;
    ip: string;
    purpose: CustomerAuthPurpose;
    subjectId?: string;
    customerId?: string;
    shouldSend: boolean;
  }) {
    if (!this.sms.isConfigured()) {
      throw new BadRequestException(
        'SMS doğrulama hizmeti henüz yapılandırılmadı.',
      );
    }
    const phoneHash = this.hashSensitive(input.phone);
    const requestIpHash = this.hashSensitive(input.ip || 'unknown');
    const since = new Date(Date.now() - RATE_WINDOW_MS);
    const [phoneCount, ipCount, latestChallenge] = await Promise.all([
      this.prisma.customerAuthChallenge.count({
        where: { phoneHash, createdAt: { gte: since } },
      }),
      this.prisma.customerAuthChallenge.count({
        where: { requestIpHash, createdAt: { gte: since } },
      }),
      this.prisma.customerAuthChallenge.findFirst({
        where: {
          phoneHash,
          purpose: input.purpose,
          subjectId: input.subjectId,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (
      latestChallenge &&
      !latestChallenge.consumedAt &&
      latestChallenge.expiresAt > new Date() &&
      Date.now() - latestChallenge.createdAt.getTime() < RESEND_INTERVAL_MS
    ) {
      return this.genericResponse(latestChallenge.id);
    }
    const challengeId = randomUUID();
    if (phoneCount >= MAX_PHONE_REQUESTS || ipCount >= MAX_IP_REQUESTS) {
      return this.genericResponse(challengeId);
    }
    const code = this.createCode();
    const challenge = await this.prisma.customerAuthChallenge.create({
      data: {
        id: challengeId,
        customerId: input.customerId,
        phoneHash,
        requestIpHash,
        codeHash: this.hashCode(challengeId, code),
        purpose: input.purpose,
        subjectId: input.subjectId,
        expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
      },
    });
    if (input.shouldSend) {
      const result = await this.sms.send({
        to: input.phone,
        message: `Ramazan Inanc Hair Art Studio dogrulama kodunuz: ${code}. Kod 5 dakika gecerlidir.`,
        idempotencyKey: `customer-otp:${challenge.id}`,
        kind: 'OTP',
      });
      if (!result.accepted) {
        await this.prisma.customerAuthChallenge.update({
          where: { id: challenge.id },
          data: { consumedAt: new Date() },
        });
        throw new BadRequestException(
          'Doğrulama kodu şu an gönderilemedi. Lütfen biraz sonra tekrar dene.',
        );
      }
    }
    return {
      ...this.genericResponse(challenge.id),
      ...(this.sms.isDevelopment() ? { developmentCode: code } : {}),
    };
  }

  private async consumeChallenge(
    transaction: Pick<Prisma.TransactionClient, 'customerAuthChallenge'>,
    challenge: {
      id: string;
      codeHash: string;
      expiresAt: Date;
      attemptCount: number;
    },
    code: string,
  ) {
    if (
      challenge.expiresAt <= new Date() ||
      challenge.attemptCount >= MAX_VERIFY_ATTEMPTS
    ) {
      throw this.invalidCode();
    }
    if (
      !this.safeHashEquals(
        this.hashCode(challenge.id, code),
        challenge.codeHash,
      )
    ) {
      const nextAttempt = challenge.attemptCount + 1;
      await transaction.customerAuthChallenge.update({
        where: { id: challenge.id },
        data: {
          attemptCount: nextAttempt,
          ...(nextAttempt >= MAX_VERIFY_ATTEMPTS
            ? { consumedAt: new Date() }
            : {}),
        },
      });
      throw this.invalidCode();
    }
    const consumed = await transaction.customerAuthChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attemptCount: { lt: MAX_VERIFY_ATTEMPTS },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw this.invalidCode();
  }

  private genericResponse(challengeId: string) {
    return {
      accepted: true as const,
      challengeId,
      expiresInSeconds: OTP_LIFETIME_MS / 1000,
      resendAfterSeconds: RESEND_INTERVAL_MS / 1000,
      message: 'Bilgiler eşleştiyse doğrulama kodu telefonuna gönderildi.',
    };
  }

  private createCode() {
    if (process.env.NODE_ENV !== 'production') {
      const developmentCode =
        process.env.CUSTOMER_AUTH_DEMO_CODE ??
        process.env.BOOKING_ACCESS_DEMO_CODE ??
        process.env.OTP_DEMO_CODE;
      if (developmentCode) return developmentCode;
    }
    return randomInt(100000, 1000000).toString();
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashSensitive(value: string) {
    return createHmac('sha256', this.otpSecret()).update(value).digest('hex');
  }

  private hashCode(challengeId: string, code: string) {
    return createHmac('sha256', this.otpSecret())
      .update(`${challengeId}:${code}`)
      .digest('hex');
  }

  private safeHashEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(
      createHash('sha256').update(left).digest('hex'),
      'hex',
    );
    const rightBuffer = Buffer.from(
      createHash('sha256').update(right).digest('hex'),
      'hex',
    );
    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private otpSecret() {
    const value =
      process.env.CUSTOMER_AUTH_OTP_SECRET ??
      process.env.BOOKING_ACCESS_OTP_SECRET;
    if (!value || value.length < 32) {
      throw new Error('CUSTOMER_AUTH_OTP_SECRET en az 32 karakter olmalıdır.');
    }
    return value;
  }

  private invalidCode() {
    return new UnauthorizedException(
      'Doğrulama kodu geçersiz veya süresi dolmuş.',
    );
  }
}
