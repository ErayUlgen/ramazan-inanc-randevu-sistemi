import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingStatus,
  NotificationEventType,
  NotificationStatus,
  Prisma,
  VisitStatus,
} from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { AvailabilityService } from '../availability/availability.service';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import { ProfessionalAvailabilityService } from '../availability/professional-availability.service';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import {
  branchDayBounds,
  toBranchDateTime,
  toDateKey,
} from '../common/branch-time';
import {
  normalizeTurkishMobile,
  tryNormalizeTurkishMobile,
} from '../common/phone';
import { lockBranchSchedule } from '../common/schedule-lock';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingDecision,
  BookingDecisionDto,
} from './dto/booking-decision.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ConfirmHoldDto } from './dto/confirm-hold.dto';
import { CreateHoldDto } from './dto/create-hold.dto';
import { CustomerAuthService } from '../customer-account/customer-auth.service';
import { CustomerSessionService } from '../customer-account/customer-session.service';
import { ListAdminBookingsDto } from './dto/list-admin-bookings.dto';
import { ProfessionalServiceResolver } from '../scheduling/professional-service-resolver.service';
import { FormsService } from '../forms/forms.service';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.HOLD,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.CONFIRMED,
];

const ADMIN_BOOKING_INCLUDE = {
  customer: {
    select: { id: true, fullName: true, phone: true, email: true },
  },
  professional: {
    select: { id: true, slug: true, name: true, title: true },
  },
  items: {
    select: {
      id: true,
      serviceId: true,
      serviceName: true,
      durationMinutes: true,
      priceKurus: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  formSubmissions: {
    select: { id: true, status: true, isRequired: true },
  },
} satisfies Prisma.BookingInclude;

type AdminBookingRecord = Prisma.BookingGetPayload<{
  include: typeof ADMIN_BOOKING_INCLUDE;
}>;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly schedule: ScheduleValidationService,
    private readonly hours: BusinessHoursService,
    private readonly outbox: NotificationOutboxService,
    private readonly audit: OperationsAuditService,
    private readonly customerAuth: CustomerAuthService,
    private readonly customerSessions: CustomerSessionService,
    private readonly serviceResolver: ProfessionalServiceResolver,
    private readonly professionalAvailability: ProfessionalAvailabilityService,
    private readonly forms: FormsService,
  ) {}

  async createHold(dto: CreateHoldDto) {
    if (dto.serviceIds.length !== 1 || new Set(dto.serviceIds).size !== 1) {
      throw new BadRequestException(
        'Online randevuda yalnızca bir hizmet seçilebilir.',
      );
    }

    const availability = await this.availability.getForBranch(dto.branchSlug, {
      date: dto.date,
      serviceIds: dto.serviceIds.join(','),
      professionalId: dto.professionalId,
    });
    const slot = availability.slots.find(
      (item) => item.startTime === dto.startTime,
    );
    if (!slot) throw new ConflictException('Seçilen saat artık uygun değil.');

    const professionalId =
      dto.professionalId ?? slot.availableProfessionalIds[0];
    if (!slot.availableProfessionalIds.includes(professionalId)) {
      throw new ConflictException('Seçilen uzman bu saatte uygun değil.');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { slug: dto.branchSlug },
    });
    if (!branch) throw new NotFoundException('Salon bulunamadı.');
    const startAt = toBranchDateTime(dto.date, dto.startTime);
    const holdExpiresAt = new Date(Date.now() + 5 * 60_000);
    const holdToken = randomBytes(32).toString('base64url');

    try {
      const booking = await this.prisma.$transaction(async (transaction) => {
        await lockBranchSchedule(transaction, branch.id);
        const selection = await this.serviceResolver.resolveSelection(
          branch.id,
          professionalId,
          dto.serviceIds,
          'public',
          transaction,
        );
        const endAt = new Date(
          startAt.getTime() + selection.totalDurationMinutes * 60_000,
        );
        const occupancySegments = this.serviceResolver.buildAbsoluteOccupancy(
          professionalId,
          startAt,
          selection.services,
        );
        await this.schedule.assertAvailable(transaction, {
          branchId: branch.id,
          professionalId,
          startAt,
          endAt,
          occupancySegments,
        });
        return transaction.booking.create({
          data: {
            publicCode: this.createPublicCode(),
            branchId: branch.id,
            professionalId,
            status: BookingStatus.HOLD,
            startAt,
            endAt,
            totalDurationMinutes: selection.totalDurationMinutes,
            totalPriceKurus: selection.totalPriceKurus,
            holdExpiresAt,
            holdTokenHash: this.hash(holdToken),
            items: {
              create: selection.services.map((service, index) =>
                this.serviceResolver.toBookingItemCreate(service, index),
              ),
            },
            occupancySegments: { create: occupancySegments },
          },
          include: { professional: true, items: true },
        });
      });

      return {
        id: booking.id,
        publicCode: booking.publicCode,
        holdToken,
        holdExpiresAt,
        endAt: booking.endAt,
        startAt: booking.startAt,
        professional: booking.professional,
        items: booking.items,
        totalDurationMinutes: booking.totalDurationMinutes,
        totalPriceKurus: booking.totalPriceKurus,
      };
    } catch (error) {
      if (this.looksLikeOverlap(error)) {
        throw new ConflictException(
          'Bu saat az önce başka bir müşteri tarafından seçildi.',
        );
      }
      throw error;
    }
  }

  async confirmHold(
    id: string,
    dto: ConfirmHoldDto,
    authenticatedCustomerId?: string,
    sessionContext: { ip?: string; userAgent?: string } = {},
  ) {
    const authenticatedCustomer = authenticatedCustomerId
      ? await this.prisma.customer.findUnique({
          where: { id: authenticatedCustomerId },
        })
      : null;
    const fullName =
      authenticatedCustomer?.fullName ?? dto.fullName?.trim() ?? '';
    if (fullName.length < 2) {
      throw new BadRequestException('Ad soyad bilgisi geçerli değil.');
    }
    if (
      !authenticatedCustomer &&
      (!dto.phone || !dto.challengeId || !dto.verificationCode)
    ) {
      throw new BadRequestException(
        'Telefon doğrulaması tamamlanmadan randevu oluşturulamaz.',
      );
    }
    const phone =
      authenticatedCustomer?.phone ?? normalizeTurkishMobile(dto.phone!);
    const outcome = await this.prisma.$transaction(async (transaction) => {
      const booking = await transaction.booking.findUnique({
        where: { id },
        include: { professional: true, items: true },
      });
      if (!booking) throw new NotFoundException('Randevu bloğu bulunamadı.');
      if (booking.status !== BookingStatus.HOLD) {
        throw new ConflictException('Bu randevu bloğu artık kullanılamaz.');
      }
      if (!booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) {
        await transaction.booking.update({
          where: { id },
          data: { status: BookingStatus.EXPIRED },
        });
        throw new ConflictException(
          'Beş dakikalık süre doldu. Lütfen saati yeniden seçin.',
        );
      }
      if (
        !booking.holdTokenHash ||
        !this.safeHashEquals(dto.holdToken, booking.holdTokenHash)
      ) {
        throw new BadRequestException(
          'Randevu güvenlik anahtarı geçerli değil.',
        );
      }

      if (!authenticatedCustomer) {
        await this.customerAuth.consumeBookingCode(transaction, {
          bookingId: id,
          phone,
          challengeId: dto.challengeId!,
          code: dto.verificationCode!,
        });
      }
      const customer = authenticatedCustomer
        ? await transaction.customer.findUniqueOrThrow({
            where: { id: authenticatedCustomer.id },
          })
        : await transaction.customer.upsert({
            where: { phone },
            update: { fullName },
            create: { phone, fullName },
          });
      if (customer.onlineBookingBlockedAt) {
        await transaction.booking.update({
          where: { id },
          data: {
            status: BookingStatus.EXPIRED,
            holdExpiresAt: null,
            holdTokenHash: null,
          },
        });
        await this.audit.write(transaction, {
          branchId: booking.branchId,
          bookingId: booking.id,
          entityType: 'BOOKING',
          entityId: booking.id,
          action: 'ONLINE_BOOKING_RESTRICTED',
          actorType: AuditActorType.SYSTEM,
          afterData: { holdReleased: true },
        });
        return { onlineBookingBlocked: true as const };
      }
      const confirmed = await transaction.booking.update({
        where: { id },
        data: {
          customerId: customer.id,
          customerNameSnapshot: fullName,
          customerPhoneSnapshot: phone,
          notificationsEnabled: customer.smsNotificationsEnabled,
          customerNote: dto.note?.trim() || null,
          status: BookingStatus.PENDING_APPROVAL,
          holdExpiresAt: null,
          holdTokenHash: null,
        },
        include: { professional: true, items: true, branch: true },
      });
      await this.forms.assignRequiredForms(transaction, {
        branchId: confirmed.branchId,
        bookingId: confirmed.id,
        customerId: customer.id,
        serviceIds: confirmed.items.map((item) => item.serviceId),
      });
      await this.outbox.enqueue(
        transaction,
        confirmed.id,
        NotificationEventType.BOOKING_RECEIVED,
      );
      await this.audit.write(transaction, {
        branchId: confirmed.branchId,
        bookingId: confirmed.id,
        entityType: 'BOOKING',
        entityId: confirmed.id,
        action: 'ONLINE_BOOKING_REQUESTED',
        actorType: AuditActorType.CUSTOMER,
        afterData: {
          status: confirmed.status,
          professionalId: confirmed.professionalId,
          startAt: confirmed.startAt.toISOString(),
          endAt: confirmed.endAt.toISOString(),
          serviceNames: confirmed.items.map((item) => item.serviceName),
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: confirmed.branchId,
          resourceType: 'BOOKING',
          resourceId: confirmed.id,
          action: 'ONLINE_BOOKING_REQUESTED',
        },
      });
      const customerSession = authenticatedCustomer
        ? undefined
        : await this.customerSessions.create(
            customer.id,
            sessionContext,
            transaction,
          );

      return {
        onlineBookingBlocked: false as const,
        customerId: customer.id,
        id: confirmed.id,
        publicCode: confirmed.publicCode,
        status: confirmed.status,
        message: 'Randevu talebiniz alındı ve yönetici onayına gönderildi.',
        arrivalLeadMinutes: confirmed.branch.arrivalLeadMinutes,
        reminderLeadMinutes: confirmed.branch.reminderLeadMinutes,
        startAt: confirmed.startAt,
        endAt: confirmed.endAt,
        professional: confirmed.professional,
        items: confirmed.items,
        customerSession,
      };
    });
    if (outcome.onlineBookingBlocked) {
      throw new ConflictException({
        code: 'ONLINE_BOOKING_RESTRICTED',
        message:
          'Online randevu talebini şu anda tamamlayamıyoruz. Salon ekibimiz uygunluğu seninle birlikte değerlendirebilir.',
      });
    }
    const { onlineBookingBlocked, ...result } = outcome;
    void onlineBookingBlocked;
    return result;
  }

  async listForAdmin(
    branchId: string,
    query: ListAdminBookingsDto,
    scopedProfessionalId?: string,
  ) {
    const text = query.query?.trim();
    const phoneDigits = text?.replace(/\D/g, '') ?? '';
    const normalizedPhone = text ? tryNormalizeTurkishMobile(text) : null;
    const from = query.from ? branchDayBounds(query.from).start : undefined;
    const to = query.to ? branchDayBounds(query.to).end : undefined;
    if (from && to && to.getTime() - from.getTime() > 31 * 86_400_000) {
      throw new BadRequestException(
        'Randevu aralığı en fazla 31 gün olabilir.',
      );
    }
    const bookings = await this.prisma.booking.findMany({
      where: {
        branchId,
        ...(scopedProfessionalId
          ? { professionalId: scopedProfessionalId }
          : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.visitStatus ? { visitStatus: query.visitStatus } : {}),
        ...(query.professionalId
          ? { professionalId: query.professionalId }
          : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(from || to
          ? {
              startAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lt: to } : {}),
              },
            }
          : {}),
        ...(text
          ? {
              OR: [
                { publicCode: { contains: text, mode: 'insensitive' } },
                {
                  customerNameSnapshot: {
                    contains: text,
                    mode: 'insensitive',
                  },
                },
                ...(phoneDigits.length >= 2
                  ? [
                      {
                        customerPhoneSnapshot: {
                          contains:
                            normalizedPhone ?? phoneDigits.replace(/^0/, ''),
                        },
                      },
                    ]
                  : []),
                {
                  items: {
                    some: {
                      serviceName: {
                        contains: text,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
                {
                  professional: {
                    name: { contains: text, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: ADMIN_BOOKING_INCLUDE,
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = bookings.length > query.limit;
    const page = bookings.slice(0, query.limit);
    return {
      items: page.map((booking) => this.toAdminBooking(booking)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async getAdminBookingBoard(
    branchSlug: string,
    date: string,
    scopedProfessionalId?: string,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { slug: branchSlug },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');

    const { start: dayStart, end: dayEnd } = branchDayBounds(date);
    const now = new Date();
    const workingIntervals = await this.hours.resolveEffectiveIntervals(
      branch.id,
      date,
    );

    await this.prisma.booking.updateMany({
      where: {
        branchId: branch.id,
        status: BookingStatus.HOLD,
        holdExpiresAt: { lte: now },
      },
      data: { status: BookingStatus.EXPIRED },
    });

    const [
      professionals,
      dayBookings,
      pendingQueue,
      pendingTotal,
      scheduleBlocks,
      notificationFailures,
      bookingPolicy,
    ] = await Promise.all([
      this.prisma.professional.findMany({
        where: {
          branchId: branch.id,
          isActive: true,
          ...(scopedProfessionalId ? { id: scopedProfessionalId } : {}),
        },
        select: {
          id: true,
          slug: true,
          name: true,
          title: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.booking.findMany({
        where: {
          branchId: branch.id,
          ...(scopedProfessionalId
            ? { professionalId: scopedProfessionalId }
            : {}),
          status: { not: BookingStatus.EXPIRED },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        include: ADMIN_BOOKING_INCLUDE,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.booking.findMany({
        where: {
          branchId: branch.id,
          status: BookingStatus.PENDING_APPROVAL,
          startAt: { gt: now },
          ...(scopedProfessionalId
            ? { professionalId: scopedProfessionalId }
            : {}),
        },
        include: ADMIN_BOOKING_INCLUDE,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
        take: 50,
      }),
      this.prisma.booking.count({
        where: {
          branchId: branch.id,
          status: BookingStatus.PENDING_APPROVAL,
          startAt: { gt: now },
          ...(scopedProfessionalId
            ? { professionalId: scopedProfessionalId }
            : {}),
        },
      }),
      this.prisma.scheduleBlock.findMany({
        where: {
          branchId: branch.id,
          cancelledAt: null,
          ...(scopedProfessionalId
            ? { professionalId: scopedProfessionalId }
            : {}),
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        include: {
          professional: {
            select: { id: true, slug: true, name: true, title: true },
          },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.bookingNotification.count({
        where: {
          status: NotificationStatus.FAILED,
          booking: {
            branchId: branch.id,
            ...(scopedProfessionalId
              ? { professionalId: scopedProfessionalId }
              : {}),
            startAt: { lt: dayEnd },
            endAt: { gt: dayStart },
          },
        },
      }),
      this.prisma.branchBookingPolicy.findUnique({
        where: { branchId: branch.id },
        select: { pendingWarningMinutes: true },
      }),
    ]);

    const activeDayBookings = dayBookings.filter((booking) =>
      ACTIVE_BOOKING_STATUSES.includes(booking.status),
    );
    const nextBooking = activeDayBookings.find(
      (booking) => booking.endAt > now,
    );

    return {
      serverNow: now.toISOString(),
      branch: {
        id: branch.id,
        slug: branch.slug,
        name: branch.name,
        city: branch.city,
        timezone: branch.timezone,
        openingMinute: workingIntervals.length
          ? Math.min(...workingIntervals.map((item) => item.startMinute))
          : branch.openingMinute,
        closingMinute: workingIntervals.length
          ? Math.max(...workingIntervals.map((item) => item.endMinute))
          : branch.closingMinute,
        workingIntervals,
        isClosed: workingIntervals.length === 0,
        arrivalLeadMinutes: branch.arrivalLeadMinutes,
        reminderLeadMinutes: branch.reminderLeadMinutes,
        pendingWarningMinutes: bookingPolicy?.pendingWarningMinutes ?? 30,
      },
      professionals: professionals.map((professional) => ({
        id: professional.id,
        slug: professional.slug,
        name: professional.name,
        title: professional.title,
      })),
      day: {
        date,
        bookings: dayBookings.map((booking) => this.toAdminBooking(booking)),
        scheduleBlocks: scheduleBlocks.map((block) => ({
          id: block.id,
          professionalId: block.professionalId,
          professional: block.professional,
          kind: block.kind,
          title: block.title,
          internalNote: block.internalNote,
          startAt: block.startAt.toISOString(),
          endAt: block.endAt.toISOString(),
          updatedAt: block.updatedAt.toISOString(),
        })),
      },
      pendingQueue: pendingQueue.map((booking) => this.toAdminBooking(booking)),
      summary: {
        pendingTotal,
        dayActiveTotal: activeDayBookings.length,
        dayConfirmedTotal: dayBookings.filter(
          (booking) => booking.status === BookingStatus.CONFIRMED,
        ).length,
        pastTotal: dayBookings.filter(
          (booking) =>
            booking.status === BookingStatus.CONFIRMED &&
            booking.endAt <= now &&
            booking.visitStatus !== VisitStatus.NO_SHOW,
        ).length,
        noShowTotal: dayBookings.filter(
          (booking) => booking.visitStatus === VisitStatus.NO_SHOW,
        ).length,
        notificationFailures,
        nextBookingId: nextBooking?.id ?? null,
      },
    };
  }

  async getAdminWeekBoard(
    branchSlug: string,
    date: string,
    requestedProfessionalId?: string,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { slug: branchSlug },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');

    const professionals = await this.prisma.professional.findMany({
      where: { branchId: branch.id, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const selectedProfessional =
      professionals.find((item) => item.id === requestedProfessionalId) ??
      (!requestedProfessionalId ? professionals[0] : undefined);
    if (!selectedProfessional) {
      throw new NotFoundException('Seçilen uzman bu salonda bulunamadı.');
    }

    const dateKeys = weekDateKeys(date);
    const rangeStart = branchDayBounds(dateKeys[0]).start;
    const rangeEnd = branchDayBounds(dateKeys[6]).end;
    const [bookings, scheduleBlocks, dayIntervals] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          branchId: branch.id,
          professionalId: selectedProfessional.id,
          status: { not: BookingStatus.EXPIRED },
          startAt: { lt: rangeEnd },
          endAt: { gt: rangeStart },
        },
        include: ADMIN_BOOKING_INCLUDE,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.scheduleBlock.findMany({
        where: {
          branchId: branch.id,
          cancelledAt: null,
          OR: [
            { professionalId: selectedProfessional.id },
            { professionalId: null },
          ],
          startAt: { lt: rangeEnd },
          endAt: { gt: rangeStart },
        },
        include: {
          professional: {
            select: { id: true, slug: true, name: true, title: true },
          },
        },
        orderBy: { startAt: 'asc' },
      }),
      Promise.all(
        dateKeys.map(async (day) => ({
          date: day,
          intervals:
            await this.professionalAvailability.resolveEffectiveIntervals(
              branch.id,
              selectedProfessional.id,
              day,
            ),
        })),
      ),
    ]);

    const allIntervals = dayIntervals.flatMap((day) => day.intervals);
    return {
      serverNow: new Date().toISOString(),
      weekStart: dateKeys[0],
      weekEnd: dateKeys[6],
      branch: {
        id: branch.id,
        slug: branch.slug,
        name: branch.name,
        timezone: branch.timezone,
        openingMinute: allIntervals.length
          ? Math.min(...allIntervals.map((item) => item.startMinute))
          : branch.openingMinute,
        closingMinute: allIntervals.length
          ? Math.max(...allIntervals.map((item) => item.endMinute))
          : branch.closingMinute,
      },
      professionals: professionals.map(({ sortOrder, ...professional }) => {
        void sortOrder;
        return professional;
      }),
      selectedProfessional: {
        id: selectedProfessional.id,
        slug: selectedProfessional.slug,
        name: selectedProfessional.name,
        title: selectedProfessional.title,
      },
      days: dayIntervals.map((day) => ({
        date: day.date,
        isClosed: day.intervals.length === 0,
        workingIntervals: day.intervals,
      })),
      bookings: bookings.map((booking) => this.toAdminBooking(booking)),
      scheduleBlocks: scheduleBlocks.map((block) => ({
        id: block.id,
        professionalId: block.professionalId,
        professional: block.professional,
        kind: block.kind,
        title: block.title,
        internalNote: block.internalNote,
        startAt: block.startAt.toISOString(),
        endAt: block.endAt.toISOString(),
        updatedAt: block.updatedAt.toISOString(),
      })),
    };
  }

  async decide(id: string, dto: BookingDecisionDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Randevu bulunamadı.');
    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw this.staleBookingConflict();
    }

    if (dto.decision === BookingDecision.APPROVE) {
      const now = new Date();
      if (booking.startAt <= now) {
        throw new ConflictException(
          'Başlangıç zamanı geçmiş bir randevu onaylanamaz.',
        );
      }
      await this.prisma.$transaction(async (transaction) => {
        const result = await transaction.booking.updateMany({
          where: {
            id,
            status: BookingStatus.PENDING_APPROVAL,
            startAt: { gt: now },
          },
          data: {
            status: BookingStatus.CONFIRMED,
            approvedAt: now,
            visitStatus: VisitStatus.SCHEDULED,
            visitStatusUpdatedAt: now,
            revision: { increment: 1 },
          },
        });
        if (result.count !== 1) throw this.staleBookingConflict();
        await this.outbox.enqueue(
          transaction,
          id,
          NotificationEventType.BOOKING_APPROVED,
        );
        await this.audit.write(transaction, {
          branchId: booking.branchId,
          bookingId: id,
          entityType: 'BOOKING',
          entityId: id,
          action: 'BOOKING_APPROVED',
          actorType: AuditActorType.ADMIN,
          beforeData: { status: BookingStatus.PENDING_APPROVAL },
          afterData: {
            status: BookingStatus.CONFIRMED,
            visitStatus: VisitStatus.SCHEDULED,
          },
        });
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: booking.branchId,
            resourceType: 'BOOKING',
            resourceId: id,
            action: 'BOOKING_APPROVED',
          },
        });
      });
      return this.findAdminBooking(id);
    }

    const reason = dto.reason?.trim();
    if (!reason || reason.length < 3) {
      throw new BadRequestException('Red nedeni en az 3 karakter olmalıdır.');
    }
    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.booking.updateMany({
        where: { id, status: BookingStatus.PENDING_APPROVAL },
        data: {
          status: BookingStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason: reason,
          revision: { increment: 1 },
        },
      });
      if (result.count !== 1) throw this.staleBookingConflict();
      if (typeof transaction.bookingNotification?.updateMany === 'function') {
        await transaction.bookingNotification.updateMany({
          where: {
            bookingId: id,
            status: {
              in: [
                NotificationStatus.PENDING,
                NotificationStatus.RETRY_SCHEDULED,
              ],
            },
          },
          data: {
            status: NotificationStatus.SKIPPED,
            lastErrorCode: 'BOOKING_REJECTED',
            lastErrorMessage:
              'Randevu reddedildiği için bekleyen bildirim geçersiz.',
          },
        });
      }
      await this.outbox.enqueue(
        transaction,
        id,
        NotificationEventType.BOOKING_REJECTED,
      );
      await this.audit.write(transaction, {
        branchId: booking.branchId,
        bookingId: id,
        entityType: 'BOOKING',
        entityId: id,
        action: 'BOOKING_REJECTED',
        actorType: AuditActorType.ADMIN,
        beforeData: { status: BookingStatus.PENDING_APPROVAL },
        afterData: { status: BookingStatus.REJECTED },
        reason,
      });
      await transaction.slotRecoveryEvent.create({
        data: {
          branchId: booking.branchId,
          startAt: booking.startAt,
          endAt: booking.endAt,
          professionalId: booking.professionalId,
          sourceType: 'BOOKING_REJECTION',
          sourceId: id,
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: booking.branchId,
          resourceType: 'BOOKING',
          resourceId: id,
          action: 'BOOKING_REJECTED',
        },
      });
    });
    return this.findAdminBooking(id);
  }

  async cancel(id: string, dto: CancelBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Randevu bulunamadı.');
    const now = new Date();
    if (booking.status !== BookingStatus.CONFIRMED || booking.startAt <= now) {
      throw new ConflictException(
        'Yalnızca gelecekteki onaylı randevular iptal edilebilir.',
      );
    }

    const reason = dto.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestException('İptal nedeni en az 3 karakter olmalıdır.');
    }
    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.booking.updateMany({
        where: {
          id,
          status: BookingStatus.CONFIRMED,
          startAt: { gt: now },
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: reason,
          revision: { increment: 1 },
        },
      });
      if (result.count !== 1) throw this.staleBookingConflict();
      if (typeof transaction.bookingNotification?.updateMany === 'function') {
        await transaction.bookingNotification.updateMany({
          where: {
            bookingId: id,
            status: {
              in: [
                NotificationStatus.PENDING,
                NotificationStatus.RETRY_SCHEDULED,
              ],
            },
          },
          data: {
            status: NotificationStatus.SKIPPED,
            lastErrorCode: 'BOOKING_CANCELLED',
            lastErrorMessage:
              'Randevu iptal edildiği için bekleyen bildirim geçersiz.',
          },
        });
      }
      await this.outbox.enqueue(
        transaction,
        id,
        NotificationEventType.BOOKING_CANCELLED,
      );
      await this.audit.write(transaction, {
        branchId: booking.branchId,
        bookingId: id,
        entityType: 'BOOKING',
        entityId: id,
        action: 'BOOKING_CANCELLED',
        actorType: AuditActorType.ADMIN,
        beforeData: { status: BookingStatus.CONFIRMED },
        afterData: { status: BookingStatus.CANCELLED },
        reason,
      });
      await transaction.slotRecoveryEvent.create({
        data: {
          branchId: booking.branchId,
          startAt: booking.startAt,
          endAt: booking.endAt,
          professionalId: booking.professionalId,
          sourceType: 'BOOKING_CANCELLATION',
          sourceId: id,
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: booking.branchId,
          resourceType: 'BOOKING',
          resourceId: id,
          action: 'BOOKING_CANCELLED',
        },
      });
    });
    return this.findAdminBooking(id);
  }

  private async findAdminBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: ADMIN_BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException('Randevu bulunamadı.');
    return this.toAdminBooking(booking);
  }

  private toAdminBooking(booking: AdminBookingRecord) {
    const formSubmissions = booking.formSubmissions ?? [];

    return {
      id: booking.id,
      publicCode: booking.publicCode,
      status: booking.status,
      source: booking.source,
      visitStatus: booking.visitStatus,
      seriesId: booking.seriesId,
      occurrenceIndex: booking.occurrenceIndex,
      isSeriesException: booking.isSeriesException,
      scheduleOverride: booking.scheduleOverride,
      overrideReason: booking.overrideReason,
      revision: booking.revision,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      totalDurationMinutes: booking.totalDurationMinutes,
      totalPriceKurus: booking.totalPriceKurus,
      holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
      customerNameSnapshot: booking.customerNameSnapshot,
      customerPhoneSnapshot: booking.customerPhoneSnapshot,
      customerNote: booking.customerNote,
      adminNote: booking.adminNote,
      notificationsEnabled: booking.notificationsEnabled,
      rejectionReason: booking.rejectionReason,
      cancellationReason: booking.cancellationReason,
      approvedAt: booking.approvedAt?.toISOString() ?? null,
      rejectedAt: booking.rejectedAt?.toISOString() ?? null,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      visitStatusUpdatedAt: booking.visitStatusUpdatedAt?.toISOString() ?? null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      customer: booking.customer,
      professional: booking.professional,
      items: booking.items,
      formStatus: formSubmissions.length
        ? formSubmissions.every((item) => item.status === 'REVIEWED')
          ? 'REVIEWED'
          : formSubmissions.every((item) => item.status !== 'PENDING')
            ? 'COMPLETED'
            : 'PENDING'
        : 'NOT_REQUIRED',
      formSubmissionCount: formSubmissions.length,
    };
  }

  private createPublicCode(): string {
    return `RI-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeHashEquals(value: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(value), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private looksLikeOverlap(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('booking_no_overlap') ||
      message.includes('exclusion constraint')
    );
  }

  private staleBookingConflict(): ConflictException {
    return new ConflictException(
      'Randevu başka bir işlemde güncellendi. Panoyu yenileyin.',
    );
  }
}

function weekDateKeys(date: string): string[] {
  const anchor = branchDayBounds(date).start;
  const day = new Date(anchor.getTime() + 12 * 60 * 60_000).getUTCDay();
  const monday = new Date(anchor.getTime() - ((day + 6) % 7) * 86_400_000);
  return Array.from({ length: 7 }, (_, index) =>
    toDateKey(new Date(monday.getTime() + index * 86_400_000)),
  );
}
