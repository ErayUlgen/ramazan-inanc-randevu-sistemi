import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { maskPhone, tryNormalizeTurkishMobile } from '../common/phone';
import { SmsGatewayService } from '../notifications/sms-gateway.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingAccessSessionService } from './booking-access-session.service';
import { RequestBookingAccessCodeDto } from './dto/request-booking-access-code.dto';
import { VerifyBookingAccessCodeDto } from './dto/verify-booking-access-code.dto';

const OTP_LIFETIME_MS = 5 * 60_000;
const RATE_WINDOW_MS = 15 * 60_000;
const MAX_PHONE_REQUESTS = 5;
const MAX_IP_REQUESTS = 20;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class BookingAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsGatewayService,
    private readonly sessions: BookingAccessSessionService,
  ) {}

  async requestCode(dto: RequestBookingAccessCodeDto, ip: string) {
    if (!this.sms.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMS doğrulama hizmeti henüz yapılandırılmadı.',
      );
    }
    const reference = dto.referenceCode.trim().toUpperCase();
    const phone = tryNormalizeTurkishMobile(dto.phone);
    const referenceHash = this.hashSensitive(reference);
    const phoneHash = this.hashSensitive(phone ?? dto.phone.replace(/\D/g, ''));
    const ipHash = this.hashSensitive(ip || 'unknown');
    const rateSince = new Date(Date.now() - RATE_WINDOW_MS);
    const [phoneRequests, ipRequests] = await Promise.all([
      this.prisma.bookingAccessChallenge.count({
        where: { phoneHash, createdAt: { gte: rateSince } },
      }),
      this.prisma.bookingAccessChallenge.count({
        where: { requestIpHash: ipHash, createdAt: { gte: rateSince } },
      }),
    ]);
    if (phoneRequests >= MAX_PHONE_REQUESTS || ipRequests >= MAX_IP_REQUESTS) {
      return this.genericCodeResponse();
    }

    const booking = phone
      ? await this.prisma.booking.findUnique({
          where: { publicCode: reference },
          include: { customer: true },
        })
      : null;
    const matches = Boolean(
      booking?.customer && booking.customer.phone === phone,
    );
    const challengeId = randomUUID();
    const code = this.createCode();
    const challenge = await this.prisma.bookingAccessChallenge.create({
      data: {
        id: challengeId,
        bookingId: matches ? booking!.id : null,
        referenceHash,
        phoneHash,
        requestIpHash: ipHash,
        codeHash: this.hashCode(challengeId, code),
        expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
      },
    });

    if (matches && phone) {
      const result = await this.sms.send({
        to: phone,
        message: `Ramazan İnanç Hair Art Studio randevu doğrulama kodunuz: ${code}. Kod 5 dakika geçerlidir.`,
        idempotencyKey: `booking-access:${challenge.id}`,
      });
      if (!result.accepted) {
        await this.prisma.bookingAccessChallenge.update({
          where: { id: challenge.id },
          data: { consumedAt: new Date() },
        });
      }
    }

    return {
      ...this.genericCodeResponse(),
      ...(this.sms.isDevelopment() ? { developmentCode: code } : {}),
    };
  }

  async verifyCode(dto: VerifyBookingAccessCodeDto) {
    const reference = dto.referenceCode.trim().toUpperCase();
    const phone = tryNormalizeTurkishMobile(dto.phone);
    const referenceHash = this.hashSensitive(reference);
    const phoneHash = this.hashSensitive(phone ?? dto.phone.replace(/\D/g, ''));
    const challenge = await this.prisma.bookingAccessChallenge.findFirst({
      where: { referenceHash, phoneHash, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      !challenge ||
      challenge.expiresAt <= new Date() ||
      challenge.attemptCount >= MAX_VERIFY_ATTEMPTS ||
      !challenge.bookingId
    )
      throw this.invalidCode();

    if (
      !this.safeHashEquals(
        this.hashCode(challenge.id, dto.code),
        challenge.codeHash,
      )
    ) {
      const nextAttempt = challenge.attemptCount + 1;
      await this.prisma.bookingAccessChallenge.update({
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

    const consumed = await this.prisma.bookingAccessChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        attemptCount: { lt: MAX_VERIFY_ATTEMPTS },
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw this.invalidCode();
    const session = this.sessions.create(challenge.bookingId, challenge.id);
    return { ...session, bookingId: challenge.bookingId };
  }

  async current(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        branch: true,
        customer: true,
        professional: true,
        items: { orderBy: { sortOrder: 'asc' } },
        notifications: { orderBy: { createdAt: 'desc' }, take: 30 },
        changeRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { requestedProfessional: true },
        },
      },
    });
    if (!booking || !booking.customer) throw this.invalidSession();
    return {
      publicCode: booking.publicCode,
      status: booking.status,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      totalDurationMinutes: booking.totalDurationMinutes,
      totalPriceKurus: booking.totalPriceKurus,
      customer: {
        fullName: booking.customer.fullName,
        phoneMasked: maskPhone(booking.customer.phone),
      },
      professional: {
        id: booking.professional.id,
        name: booking.professional.name,
        title: booking.professional.title,
      },
      branch: {
        id: booking.branch.id,
        slug: booking.branch.slug,
        name: booking.branch.name,
        city: booking.branch.city,
        district: booking.branch.district,
        address: booking.branch.address,
        timezone: booking.branch.timezone,
        arrivalLeadMinutes: booking.branch.arrivalLeadMinutes,
        reminderLeadMinutes: booking.branch.reminderLeadMinutes,
      },
      items: booking.items.map((item) => ({
        id: item.id,
        serviceName: item.serviceName,
        durationMinutes: item.durationMinutes,
        priceKurus: item.priceKurus,
      })),
      notifications: booking.notifications.map((notification) => ({
        id: notification.id,
        eventType: notification.eventType,
        channel: notification.channel,
        status: notification.status,
        scheduledFor: notification.scheduledFor.toISOString(),
        sentAt: notification.sentAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
      })),
      changeRequests: booking.changeRequests.map((request) => ({
        id: request.id,
        status: request.status,
        requestedStartAt: request.requestedStartAt.toISOString(),
        requestedEndAt: request.requestedEndAt.toISOString(),
        requestedProfessional: {
          id: request.requestedProfessional.id,
          name: request.requestedProfessional.name,
        },
        reason: request.reason,
        decisionReason: request.decisionReason,
        expiresAt: request.expiresAt.toISOString(),
        decidedAt: request.decidedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString(),
      })),
      revision: booking.revision,
      canCancel:
        this.isCustomerManageableStatus(booking.status) &&
        booking.startAt > new Date(),
      canRequestChange:
        this.isCustomerManageableStatus(booking.status) &&
        booking.startAt > new Date(),
    };
  }

  private isCustomerManageableStatus(status: BookingStatus) {
    return (
      status === BookingStatus.PENDING_APPROVAL ||
      status === BookingStatus.CONFIRMED
    );
  }

  async calendar(
    bookingId: string,
  ): Promise<{ filename: string; content: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        branch: true,
        professional: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!booking || booking.status !== 'CONFIRMED') {
      throw new UnauthorizedException(
        'Takvim kaydı yalnızca onaylı randevular için hazırlanabilir.',
      );
    }
    const escape = (value: string) =>
      value
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
    const utc = (value: Date) =>
      value
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
    const location = [
      booking.branch.address,
      booking.branch.district,
      booking.branch.city,
    ]
      .filter(Boolean)
      .join(', ');
    const description = `${booking.items.map((item) => item.serviceName).join(', ')} | Uzman: ${booking.professional.name} | Referans: ${booking.publicCode} | En iyi deneyim için lütfen 15 dakika erken gelin.`;
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ramazan Inanc Hair Art Studio//Booking//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${booking.id}@ramazaninanc.com`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(booking.startAt)}`,
      `DTEND:${utc(booking.endAt)}`,
      `SUMMARY:${escape('Ramazan İnanç Hair Art Studio Randevusu')}`,
      `DESCRIPTION:${escape(description)}`,
      ...(location ? [`LOCATION:${escape(location)}`] : []),
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
    return {
      filename: `ramazan-inanc-${booking.publicCode.toLowerCase()}.ics`,
      content,
    };
  }

  private genericCodeResponse() {
    return {
      accepted: true,
      expiresInSeconds: OTP_LIFETIME_MS / 1000,
      resendAfterSeconds: 60,
      message: 'Bilgiler eşleştiyse doğrulama kodu gönderildi.',
    };
  }

  private createCode(): string {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.BOOKING_ACCESS_DEMO_CODE
    ) {
      return process.env.BOOKING_ACCESS_DEMO_CODE;
    }
    return randomInt(100000, 1000000).toString();
  }

  private hashSensitive(value: string): string {
    return createHmac('sha256', this.otpSecret()).update(value).digest('hex');
  }

  private hashCode(challengeId: string, code: string): string {
    return createHmac('sha256', this.otpSecret())
      .update(`${challengeId}:${code}`)
      .digest('hex');
  }

  private safeHashEquals(left: string, right: string): boolean {
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

  private otpSecret(): string {
    const value = process.env.BOOKING_ACCESS_OTP_SECRET;
    if (!value || value.length < 32) {
      throw new Error('BOOKING_ACCESS_OTP_SECRET en az 32 karakter olmalıdır.');
    }
    return value;
  }

  private invalidCode() {
    return new UnauthorizedException(
      'Doğrulama kodu geçersiz veya süresi dolmuş.',
    );
  }

  private invalidSession() {
    return new UnauthorizedException('Randevu erişim oturumu geçerli değil.');
  }
}
