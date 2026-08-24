import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingSource,
  BookingStatus,
  NotificationEventType,
  Prisma,
  SlotRecoveryStatus,
  VisitStatus,
  WaitlistEntryStatus,
  WaitlistOfferStatus,
} from '@prisma/client';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import { BookingPolicyService } from '../booking-policy/booking-policy.service';
import {
  minuteOfDay,
  toBranchDateTime,
  toDateKey,
} from '../common/branch-time';
import { normalizeTurkishMobile } from '../common/phone';
import { lockBranchSchedule } from '../common/schedule-lock';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { SmsGatewayService } from '../notifications/sms-gateway.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManualWaitlistOfferDto } from './dto/manual-waitlist-offer.dto';
import { RequestWaitlistCodeDto } from './dto/request-waitlist-code.dto';
import { VerifyWaitlistCodeDto } from './dto/verify-waitlist-code.dto';
import {
  EffectiveProfessionalService,
  ProfessionalServiceResolver,
} from '../scheduling/professional-service-resolver.service';

const OTP_LIFETIME_MS = 5 * 60_000;
const RATE_WINDOW_MS = 15 * 60_000;
const ENTRY_INCLUDE = {
  professional: true,
  services: {
    include: { service: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  offers: {
    include: { professional: true },
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
} satisfies Prisma.WaitlistEntryInclude;

type EntryRecord = Prisma.WaitlistEntryGetPayload<{
  include: typeof ENTRY_INCLUDE;
}>;

type ChallengePayload = {
  branchSlug: string;
  fullName: string;
  phone: string;
  serviceIds: string[];
  professionalId?: string;
  dateFrom: string;
  dateTo: string;
  startTime: string;
  endTime: string;
  note?: string;
};

@Injectable()
export class WaitlistService {
  readonly cookieName = 'ri_waitlist_access';

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: ScheduleValidationService,
    private readonly policies: BookingPolicyService,
    private readonly outbox: NotificationOutboxService,
    private readonly audit: OperationsAuditService,
    private readonly sms: SmsGatewayService,
    private readonly serviceResolver: ProfessionalServiceResolver,
  ) {}

  async requestCode(dto: RequestWaitlistCodeDto, ip: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { slug: dto.branchSlug },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');
    const policy = await this.policies.get(branch.id);
    if (!policy.waitlistEnabled) {
      throw new ConflictException('Bekleme listesi şu anda kullanılamıyor.');
    }
    const phone = normalizeTurkishMobile(dto.phone);
    const serviceIds = [...new Set(dto.serviceIds)];
    const services = await this.prisma.service.findMany({
      where: {
        branchId: branch.id,
        id: { in: serviceIds },
        isActive: true,
        isOnlineBookable: true,
      },
    });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Hizmet seçimi geçerli değil.');
    }
    if (dto.professionalId) {
      const professional = await this.prisma.professional.findFirst({
        where: {
          id: dto.professionalId,
          branchId: branch.id,
          isActive: true,
          isOnlineBookable: true,
        },
        include: { services: true },
      });
      if (
        !professional ||
        !serviceIds.every((id) =>
          professional.services.some((item) => item.serviceId === id),
        )
      ) {
        throw new BadRequestException('Uzman seçimi geçerli değil.');
      }
    }
    this.validatePreference(dto);
    const phoneHash = this.hashSensitive(phone);
    const ipHash = this.hashSensitive(ip || 'unknown');
    const since = new Date(Date.now() - RATE_WINDOW_MS);
    const [phoneCount, ipCount] = await Promise.all([
      this.prisma.waitlistAccessChallenge.count({
        where: { phoneHash, createdAt: { gte: since } },
      }),
      this.prisma.waitlistAccessChallenge.count({
        where: { requestIpHash: ipHash, createdAt: { gte: since } },
      }),
    ]);
    if (phoneCount >= 5 || ipCount >= 20) {
      return {
        accepted: true,
        resendAfterSeconds: policy.otpResendSeconds,
        expiresInSeconds: OTP_LIFETIME_MS / 1000,
      };
    }
    const id = randomUUID();
    const code = this.createCode();
    await this.prisma.waitlistAccessChallenge.create({
      data: {
        id,
        branchId: branch.id,
        phoneHash,
        requestIpHash: ipHash,
        codeHash: this.hashCode(id, code),
        payload: {
          ...dto,
          phone,
          serviceIds,
        },
        expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
      },
    });
    const result = await this.outboxSms(phone, code, id);
    if (!result) {
      throw new ConflictException(
        'Doğrulama mesajı gönderilemedi. Lütfen tekrar deneyin.',
      );
    }
    return {
      accepted: true,
      challengeId: id,
      resendAfterSeconds: policy.otpResendSeconds,
      expiresInSeconds: OTP_LIFETIME_MS / 1000,
      ...(process.env.NODE_ENV !== 'production'
        ? { developmentCode: code }
        : {}),
    };
  }

  async verifyCode(dto: VerifyWaitlistCodeDto) {
    const challenge = await this.prisma.waitlistAccessChallenge.findUnique({
      where: { id: dto.challengeId },
    });
    const policy = challenge
      ? await this.policies.get(challenge.branchId)
      : null;
    if (
      !challenge ||
      !policy ||
      challenge.consumedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attemptCount >= policy.otpMaxAttempts
    ) {
      throw this.invalidCode();
    }
    if (
      !this.safeEquals(
        this.hashCode(challenge.id, dto.code),
        challenge.codeHash,
      )
    ) {
      const attempts = challenge.attemptCount + 1;
      await this.prisma.waitlistAccessChallenge.update({
        where: { id: challenge.id },
        data: {
          attemptCount: attempts,
          ...(attempts >= policy.otpMaxAttempts
            ? { consumedAt: new Date() }
            : {}),
        },
      });
      throw this.invalidCode();
    }
    const payload = challenge.payload as ChallengePayload;
    const accessToken = randomBytes(32).toString('base64url');
    const entry = await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.waitlistAccessChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attemptCount: { lt: policy.otpMaxAttempts },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw this.invalidCode();
      const customer = await transaction.customer.upsert({
        where: { phone: payload.phone },
        update: {},
        create: { phone: payload.phone, fullName: payload.fullName.trim() },
      });
      const created = await transaction.waitlistEntry.create({
        data: {
          branchId: challenge.branchId,
          customerId: customer.id,
          professionalId: payload.professionalId,
          fullName: payload.fullName.trim(),
          phone: payload.phone,
          note: payload.note?.trim() || null,
          dateFrom: new Date(`${payload.dateFrom}T00:00:00.000Z`),
          dateTo: new Date(`${payload.dateTo}T00:00:00.000Z`),
          startMinute: this.timeMinute(payload.startTime),
          endMinute: this.timeMinute(payload.endTime),
          accessTokenHash: this.hash(accessToken),
          services: {
            create: payload.serviceIds.map((serviceId, index) => ({
              serviceId,
              sortOrder: index,
            })),
          },
        },
        include: ENTRY_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId: challenge.branchId,
        entityType: 'WAITLIST_ENTRY',
        entityId: created.id,
        action: 'WAITLIST_JOINED',
        actorType: AuditActorType.CUSTOMER,
        afterData: this.entrySnapshot(created),
      });
      await this.outbox.enqueueWaitlist(
        transaction,
        created.id,
        created.phone,
        NotificationEventType.WAITLIST_JOINED,
        new Date(),
        `waitlist:${created.id}:joined:v1`,
      );
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: challenge.branchId,
          resourceType: 'WAITLIST_ENTRY',
          resourceId: created.id,
          action: 'CREATED',
        },
      });
      return created;
    });
    return { entry: this.toDto(entry), token: accessToken };
  }

  async current(token: string | undefined) {
    return this.toDto(await this.requireByToken(token));
  }

  async cancelCurrent(token: string | undefined) {
    const entry = await this.requireByToken(token);
    if (
      entry.status !== WaitlistEntryStatus.ACTIVE &&
      entry.status !== WaitlistEntryStatus.OFFERED
    ) {
      throw new ConflictException('Bekleme listesi kaydı artık aktif değil.');
    }
    await this.prisma.$transaction(async (transaction) => {
      const pendingOffers = await transaction.waitlistOffer.findMany({
        where: {
          waitlistEntryId: entry.id,
          status: WaitlistOfferStatus.PENDING,
        },
      });
      await transaction.waitlistOffer.updateMany({
        where: {
          waitlistEntryId: entry.id,
          status: WaitlistOfferStatus.PENDING,
        },
        data: { status: WaitlistOfferStatus.REVOKED },
      });
      await transaction.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: WaitlistEntryStatus.CANCELLED },
      });
      for (const offer of pendingOffers) {
        await transaction.slotRecoveryEvent.create({
          data: {
            branchId: entry.branchId,
            startAt: offer.startAt,
            endAt: offer.endAt,
            professionalId: offer.professionalId,
            sourceType: 'WAITLIST_CANCELLED',
            sourceId: offer.id,
          },
        });
      }
      await this.audit.write(transaction, {
        branchId: entry.branchId,
        entityType: 'WAITLIST_ENTRY',
        entityId: entry.id,
        action: 'WAITLIST_CANCELLED',
        actorType: AuditActorType.CUSTOMER,
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: entry.branchId,
          resourceType: 'WAITLIST_ENTRY',
          resourceId: entry.id,
          action: 'CANCELLED',
        },
      });
    });
    return { cancelled: true };
  }

  async acceptOffer(token: string | undefined, offerId: string) {
    const entry = await this.requireByToken(token);
    const offer = entry.offers.find((item) => item.id === offerId);
    if (
      !offer ||
      offer.status !== WaitlistOfferStatus.PENDING ||
      offer.expiresAt <= new Date()
    ) {
      throw new ConflictException('Teklif artık geçerli değil.');
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockBranchSchedule(transaction, entry.branchId);
        const fresh = await transaction.waitlistOffer.findUnique({
          where: { id: offer.id },
          include: {
            waitlistEntry: {
              include: {
                services: {
                  include: { service: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
            professional: true,
            occupancySegments: true,
          },
        });
        if (
          !fresh ||
          fresh.status !== WaitlistOfferStatus.PENDING ||
          fresh.expiresAt <= new Date() ||
          fresh.waitlistEntry.status !== WaitlistEntryStatus.OFFERED
        ) {
          throw new ConflictException('Teklif artık geçerli değil.');
        }
        const serviceSnapshot = this.readServiceSnapshot(fresh);
        const occupancySegments = fresh.occupancySegments.map((segment) => ({
          professionalId: segment.professionalId,
          startAt: segment.startAt,
          endAt: segment.endAt,
          kind: segment.kind,
        }));
        await this.schedule.assertAvailable(transaction, {
          branchId: entry.branchId,
          professionalId: fresh.professionalId,
          startAt: fresh.startAt,
          endAt: fresh.endAt,
          occupancySegments,
          excludeWaitlistOfferId: fresh.id,
        });
        await transaction.waitlistOffer.update({
          where: { id: fresh.id },
          data: {
            status: WaitlistOfferStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        });
        const totalDurationMinutes =
          fresh.totalDurationMinutes ||
          fresh.waitlistEntry.services.reduce(
            (sum, item) => sum + item.service.durationMinutes,
            0,
          );
        const totalPriceKurus =
          fresh.totalPriceKurus ||
          fresh.waitlistEntry.services.reduce(
            (sum, item) => sum + item.service.priceKurus,
            0,
          );
        const booking = await transaction.booking.create({
          data: {
            publicCode: this.publicCode(),
            branchId: entry.branchId,
            professionalId: fresh.professionalId,
            customerId: fresh.waitlistEntry.customerId,
            status: BookingStatus.PENDING_APPROVAL,
            source: BookingSource.ONLINE,
            startAt: fresh.startAt,
            endAt: fresh.endAt,
            totalDurationMinutes,
            totalPriceKurus,
            customerNameSnapshot: fresh.waitlistEntry.fullName,
            customerPhoneSnapshot: fresh.waitlistEntry.phone,
            customerNote: fresh.waitlistEntry.note,
            notificationsEnabled: true,
            visitStatus: VisitStatus.SCHEDULED,
            visitStatusUpdatedAt: new Date(),
            items: {
              create: serviceSnapshot.map((service, index) =>
                this.serviceResolver.toBookingItemCreate(service, index),
              ),
            },
            occupancySegments: { create: occupancySegments },
          },
        });
        await transaction.waitlistOffer.update({
          where: { id: fresh.id },
          data: { acceptedBookingId: booking.id },
        });
        await transaction.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: WaitlistEntryStatus.FULFILLED },
        });
        await this.outbox.enqueueWaitlist(
          transaction,
          entry.id,
          entry.phone,
          NotificationEventType.WAITLIST_OFFER_ACCEPTED,
          new Date(),
          `waitlist:${entry.id}:offer:${fresh.id}:accepted:v1`,
          {
            waitlistOfferId: fresh.id,
            payload: {
              startAt: fresh.startAt.toISOString(),
              professionalName: fresh.professional.name,
              reference: booking.publicCode,
            },
          },
        );
        await this.audit.write(transaction, {
          branchId: entry.branchId,
          bookingId: booking.id,
          entityType: 'WAITLIST_OFFER',
          entityId: fresh.id,
          action: 'WAITLIST_OFFER_ACCEPTED',
          actorType: AuditActorType.CUSTOMER,
          afterData: {
            bookingId: booking.id,
            publicCode: booking.publicCode,
          },
        });
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: entry.branchId,
            resourceType: 'WAITLIST_OFFER',
            resourceId: fresh.id,
            action: 'ACCEPTED',
          },
        });
        return {
          accepted: true,
          booking: {
            id: booking.id,
            publicCode: booking.publicCode,
            status: booking.status,
          },
        };
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async listAdmin(branchId: string, status?: WaitlistEntryStatus) {
    await this.expireOffers();
    const entries = await this.prisma.waitlistEntry.findMany({
      where: { branchId, ...(status ? { status } : {}) },
      include: ENTRY_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 300,
    });
    return entries.map((entry) => this.toDto(entry));
  }

  async createManualOffer(entryId: string, dto: ManualWaitlistOfferDto) {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: ENTRY_INCLUDE,
    });
    if (!entry)
      throw new NotFoundException('Bekleme listesi kaydı bulunamadı.');
    const startAt = toBranchDateTime(dto.date, dto.startTime);
    return this.offerEntry(entry, dto.professionalId, startAt);
  }

  async cancelAdmin(entryId: string, reason: string) {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: ENTRY_INCLUDE,
    });
    if (!entry)
      throw new NotFoundException('Bekleme listesi kaydı bulunamadı.');
    await this.prisma.$transaction(async (transaction) => {
      await transaction.waitlistOffer.updateMany({
        where: {
          waitlistEntryId: entryId,
          status: WaitlistOfferStatus.PENDING,
        },
        data: { status: WaitlistOfferStatus.REVOKED },
      });
      await transaction.waitlistEntry.update({
        where: { id: entryId },
        data: { status: WaitlistEntryStatus.CANCELLED },
      });
      await this.audit.write(transaction, {
        branchId: entry.branchId,
        entityType: 'WAITLIST_ENTRY',
        entityId: entry.id,
        action: 'WAITLIST_CANCELLED_BY_ADMIN',
        actorType: AuditActorType.ADMIN,
        reason,
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: entry.branchId,
          resourceType: 'WAITLIST_ENTRY',
          resourceId: entry.id,
          action: 'CANCELLED',
        },
      });
    });
    return { cancelled: true };
  }

  async processRecoveryEvents() {
    const ids = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT "id"
          FROM "slot_recovery_events"
          WHERE "status" IN ('PENDING', 'FAILED')
            AND "available_at" <= NOW()
          ORDER BY "created_at" ASC
          LIMIT 10
          FOR UPDATE SKIP LOCKED
        `,
      );
      if (!rows.length) return [];
      await transaction.slotRecoveryEvent.updateMany({
        where: { id: { in: rows.map((row) => row.id) } },
        data: { status: SlotRecoveryStatus.PROCESSING },
      });
      return rows.map((row) => row.id);
    });
    for (const id of ids) await this.processRecoveryEvent(id);
    return ids.length;
  }

  async expireOffers() {
    const due = await this.prisma.waitlistOffer.findMany({
      where: {
        status: WaitlistOfferStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      include: { waitlistEntry: true, professional: true },
      take: 50,
    });
    for (const offer of due) {
      await this.prisma.$transaction(async (transaction) => {
        const changed = await transaction.waitlistOffer.updateMany({
          where: {
            id: offer.id,
            status: WaitlistOfferStatus.PENDING,
            expiresAt: { lte: new Date() },
          },
          data: { status: WaitlistOfferStatus.EXPIRED },
        });
        if (changed.count !== 1) return;
        await transaction.waitlistEntry.updateMany({
          where: {
            id: offer.waitlistEntryId,
            status: WaitlistEntryStatus.OFFERED,
          },
          data: {
            status: WaitlistEntryStatus.ACTIVE,
            failedOfferCount: { increment: 1 },
          },
        });
        await this.outbox.enqueueWaitlist(
          transaction,
          offer.waitlistEntryId,
          offer.waitlistEntry.phone,
          NotificationEventType.WAITLIST_OFFER_EXPIRED,
          new Date(),
          `waitlist:${offer.waitlistEntryId}:offer:${offer.id}:expired:v1`,
          { waitlistOfferId: offer.id },
        );
        await transaction.slotRecoveryEvent.create({
          data: {
            branchId: offer.branchId,
            startAt: offer.startAt,
            endAt: offer.endAt,
            professionalId: offer.professionalId,
            sourceType: 'WAITLIST_OFFER_EXPIRED',
            sourceId: offer.id,
          },
        });
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: offer.branchId,
            resourceType: 'WAITLIST_OFFER',
            resourceId: offer.id,
            action: 'EXPIRED',
          },
        });
      });
    }
    return due.length;
  }

  sessionCookie(token: string) {
    return [
      `${this.cookieName}=${token}`,
      'Path=/api/waitlist',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${30 * 24 * 60 * 60}`,
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  clearCookie() {
    return [
      `${this.cookieName}=`,
      'Path=/api/waitlist',
      'HttpOnly',
      'SameSite=Strict',
      'Max-Age=0',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  readCookie(header: string | undefined) {
    if (!header) return undefined;
    return header
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${this.cookieName}=`))
      ?.slice(this.cookieName.length + 1);
  }

  private async processRecoveryEvent(id: string) {
    const event = await this.prisma.slotRecoveryEvent.findUnique({
      where: { id },
    });
    if (!event || event.status !== SlotRecoveryStatus.PROCESSING) return;
    try {
      const date = new Date(`${toDateKey(event.startAt)}T00:00:00.000Z`);
      const startMinute = minuteOfDay(event.startAt);
      const capacityMinutes = Math.round(
        (event.endAt.getTime() - event.startAt.getTime()) / 60_000,
      );
      const entries = await this.prisma.waitlistEntry.findMany({
        where: {
          branchId: event.branchId,
          status: WaitlistEntryStatus.ACTIVE,
          dateFrom: { lte: date },
          dateTo: { gte: date },
          startMinute: { lte: startMinute },
          endMinute: { gte: startMinute + 5 },
          ...(event.professionalId
            ? {
                OR: [
                  { professionalId: null },
                  { professionalId: event.professionalId },
                ],
              }
            : {}),
          offers: {
            none: {
              startAt: event.startAt,
              status: {
                in: [WaitlistOfferStatus.EXPIRED, WaitlistOfferStatus.REVOKED],
              },
            },
          },
        },
        include: ENTRY_INCLUDE,
        orderBy: [
          { failedOfferCount: 'asc' },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      });
      let offered = false;
      for (const entry of entries) {
        const professionalId = event.professionalId ?? entry.professionalId;
        if (!professionalId) continue;
        const selection = await this.serviceResolver
          .resolveSelection(
            entry.branchId,
            professionalId,
            entry.services.map((item) => item.serviceId),
            'public',
          )
          .catch(() => null);
        if (
          !selection ||
          selection.totalDurationMinutes > capacityMinutes ||
          entry.endMinute < startMinute + selection.totalDurationMinutes
        ) {
          continue;
        }
        try {
          await this.offerEntry(entry, professionalId, event.startAt);
          offered = true;
          break;
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
        }
      }
      await this.prisma.slotRecoveryEvent.update({
        where: { id },
        data: {
          status: SlotRecoveryStatus.PROCESSED,
          processedAt: new Date(),
          lastError: offered ? null : 'Uygun aktif bekleme kaydı bulunamadı.',
        },
      });
    } catch (error) {
      const attempts = event.attemptCount + 1;
      await this.prisma.slotRecoveryEvent.update({
        where: { id },
        data: {
          status:
            attempts >= 4
              ? SlotRecoveryStatus.PROCESSED
              : SlotRecoveryStatus.FAILED,
          attemptCount: attempts,
          availableAt: new Date(Date.now() + attempts * 60_000),
          lastError: (error instanceof Error
            ? error.message
            : String(error)
          ).slice(0, 300),
          processedAt: attempts >= 4 ? new Date() : null,
        },
      });
    }
  }

  private async offerEntry(
    entry: EntryRecord,
    professionalId: string,
    startAt: Date,
  ) {
    if (entry.status !== WaitlistEntryStatus.ACTIVE) {
      throw new ConflictException('Bekleme listesi kaydı aktif değil.');
    }
    const selection = await this.serviceResolver.resolveSelection(
      entry.branchId,
      professionalId,
      entry.services.map((item) => item.serviceId),
      'public',
    );
    const endAt = new Date(
      startAt.getTime() + selection.totalDurationMinutes * 60_000,
    );
    const occupancySegments = this.serviceResolver.buildAbsoluteOccupancy(
      professionalId,
      startAt,
      selection.services,
    );
    const policy = await this.policies.get(entry.branchId);
    const token = randomBytes(32).toString('base64url');
    try {
      const offer = await this.prisma.$transaction(async (transaction) => {
        await lockBranchSchedule(transaction, entry.branchId);
        await this.schedule.assertAvailable(transaction, {
          branchId: entry.branchId,
          professionalId,
          startAt,
          endAt,
          occupancySegments,
        });
        const current = await transaction.waitlistEntry.findUnique({
          where: { id: entry.id },
        });
        if (!current || current.status !== WaitlistEntryStatus.ACTIVE) {
          throw new ConflictException('Bekleme listesi kaydı aktif değil.');
        }
        const created = await transaction.waitlistOffer.create({
          data: {
            branchId: entry.branchId,
            waitlistEntryId: entry.id,
            professionalId,
            startAt,
            endAt,
            totalDurationMinutes: selection.totalDurationMinutes,
            totalPriceKurus: selection.totalPriceKurus,
            serviceSnapshot:
              selection.services as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(
              Date.now() + policy.waitlistOfferTtlMinutes * 60_000,
            ),
            tokenHash: this.hash(token),
            occupancySegments: { create: occupancySegments },
          },
          include: { professional: true },
        });
        await transaction.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: WaitlistEntryStatus.OFFERED },
        });
        await this.outbox.enqueueWaitlist(
          transaction,
          entry.id,
          entry.phone,
          NotificationEventType.WAITLIST_OFFERED,
          new Date(),
          `waitlist:${entry.id}:offer:${created.id}:offered:v1`,
          {
            waitlistOfferId: created.id,
            payload: {
              startAt: created.startAt.toISOString(),
              professionalName: created.professional.name,
              expiresAt: created.expiresAt.toISOString(),
            },
          },
        );
        await this.audit.write(transaction, {
          branchId: entry.branchId,
          entityType: 'WAITLIST_OFFER',
          entityId: created.id,
          action: 'WAITLIST_OFFERED',
          actorType: AuditActorType.SYSTEM,
          afterData: {
            startAt: created.startAt.toISOString(),
            endAt: created.endAt.toISOString(),
            professionalId,
            expiresAt: created.expiresAt.toISOString(),
          },
        });
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: entry.branchId,
            resourceType: 'WAITLIST_OFFER',
            resourceId: created.id,
            action: 'CREATED',
          },
        });
        return created;
      });
      return {
        id: offer.id,
        status: offer.status,
        startAt: offer.startAt.toISOString(),
        endAt: offer.endAt.toISOString(),
        expiresAt: offer.expiresAt.toISOString(),
      };
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private async requireByToken(token: string | undefined) {
    if (!token) throw this.unauthorized();
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { accessTokenHash: this.hash(token) },
      include: ENTRY_INCLUDE,
    });
    if (!entry) throw this.unauthorized();
    return entry;
  }

  private validatePreference(dto: RequestWaitlistCodeDto) {
    const from = new Date(`${dto.dateFrom}T00:00:00.000Z`);
    const to = new Date(`${dto.dateTo}T00:00:00.000Z`);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to ||
      to.getTime() - from.getTime() > 90 * 86_400_000
    ) {
      throw new BadRequestException('Tarih aralığı geçerli değil.');
    }
    const start = this.timeMinute(dto.startTime);
    const end = this.timeMinute(dto.endTime);
    if (start >= end) {
      throw new BadRequestException('Saat aralığı geçerli değil.');
    }
  }

  private entrySnapshot(entry: EntryRecord) {
    return {
      status: entry.status,
      professionalId: entry.professionalId,
      serviceIds: entry.services.map((item) => item.serviceId),
      dateFrom: toDateKey(entry.dateFrom),
      dateTo: toDateKey(entry.dateTo),
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
    };
  }

  private toDto(entry: EntryRecord) {
    return {
      id: entry.id,
      status: entry.status,
      fullName: entry.fullName,
      phoneMasked: entry.phone.replace(
        /^(\+90)(\d{3})(\d{3})(\d{2})(\d{2})$/,
        '$1 $2 *** ** $5',
      ),
      professional: entry.professional
        ? { id: entry.professional.id, name: entry.professional.name }
        : null,
      services: entry.services.map((item) => ({
        id: item.service.id,
        name: item.service.name,
        durationMinutes: item.service.durationMinutes,
      })),
      dateFrom: toDateKey(entry.dateFrom),
      dateTo: toDateKey(entry.dateTo),
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
      note: entry.note,
      failedOfferCount: entry.failedOfferCount,
      offers: entry.offers.map((offer) => ({
        id: offer.id,
        status: offer.status,
        startAt: offer.startAt.toISOString(),
        endAt: offer.endAt.toISOString(),
        expiresAt: offer.expiresAt.toISOString(),
        acceptedAt: offer.acceptedAt?.toISOString() ?? null,
        professional: {
          id: offer.professional.id,
          name: offer.professional.name,
        },
      })),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  private readServiceSnapshot(offer: {
    serviceSnapshot: Prisma.JsonValue | null;
    waitlistEntry: {
      services: {
        serviceId: string;
        service: {
          name: string;
          durationMinutes: number;
          priceKurus: number;
          preVisitInstructions: string | null;
          postVisitInstructions: string | null;
          sortOrder: number;
        };
      }[];
    };
  }): EffectiveProfessionalService[] {
    if (Array.isArray(offer.serviceSnapshot)) {
      return offer.serviceSnapshot as unknown as EffectiveProfessionalService[];
    }
    return offer.waitlistEntry.services.map((item, index) => ({
      serviceId: item.serviceId,
      serviceName: item.service.name,
      sortOrder: item.service.sortOrder ?? index,
      durationMinutes: item.service.durationMinutes,
      priceKurus: item.service.priceKurus,
      isOnlineBookable: true,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      processingStartOffsetMinutes: null,
      processingDurationMinutes: 0,
      preVisitInstructions: item.service.preVisitInstructions,
      postVisitInstructions: item.service.postVisitInstructions,
      salonDurationMinutes: item.service.durationMinutes,
      salonPriceKurus: item.service.priceKurus,
    }));
  }

  private async outboxSms(phone: string, code: string, challengeId: string) {
    const result = await this.sms.send({
      to: phone,
      message: `Ramazan İnanç Hair Art Studio bekleme listesi doğrulama kodunuz: ${code}. Kod 5 dakika geçerlidir.`,
      idempotencyKey: `waitlist-access:${challengeId}`,
    });
    return result.accepted;
  }

  private createCode() {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.BOOKING_ACCESS_DEMO_CODE
    ) {
      return process.env.BOOKING_ACCESS_DEMO_CODE;
    }
    return randomInt(100000, 1_000_000).toString();
  }

  private timeMinute(value: string) {
    const [hour, minute] = value.split(':').map(Number);
    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new BadRequestException('Saat değeri geçerli değil.');
    }
    return hour * 60 + minute;
  }

  private publicCode() {
    return `RI-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashSensitive(value: string) {
    return createHmac('sha256', this.otpSecret()).update(value).digest('hex');
  }

  private hashCode(id: string, code: string) {
    return createHmac('sha256', this.otpSecret())
      .update(`${id}:${code}`)
      .digest('hex');
  }

  private safeEquals(left: string, right: string) {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
  }

  private otpSecret() {
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

  private unauthorized() {
    return new UnauthorizedException(
      'Bekleme listesi erişim oturumu geçerli değil.',
    );
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('waitlist_offers_one_pending') ||
      message.includes('waitlist_offers_no_pending_overlap') ||
      message.includes('booking_no_overlap') ||
      message.includes('exclusion constraint')
    ) {
      throw new ConflictException(
        'Bu saat az önce başka bir işlem tarafından tutuldu.',
      );
    }
    throw error;
  }
}
