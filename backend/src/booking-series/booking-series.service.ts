import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingSeriesFrequency,
  BookingSeriesStatus,
  BookingSource,
  BookingStatus,
  NotificationEventType,
  VisitStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AvailabilityService } from '../availability/availability.service';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import { BookingPolicyService } from '../booking-policy/booking-policy.service';
import { toBranchDateTime, todayInBranch } from '../common/branch-time';
import { lockBranchSchedule } from '../common/schedule-lock';
import { normalizeTurkishMobile } from '../common/phone';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalServiceResolver } from '../scheduling/professional-service-resolver.service';
import {
  CreateAdminBookingSeriesDto,
  CreateBookingSeriesDto,
  PreviewBookingSeriesDto,
} from './dto/create-booking-series.dto';

@Injectable()
export class BookingSeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly schedule: ScheduleValidationService,
    private readonly policies: BookingPolicyService,
    private readonly resolver: ProfessionalServiceResolver,
    private readonly outbox: NotificationOutboxService,
    private readonly audit: OperationsAuditService,
  ) {}

  async previewCustomer(customerId: string, dto: PreviewBookingSeriesDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
      include: { branch: true },
    });
    if (!professional?.branch.isActive) {
      throw new BadRequestException('Uzman seçimi geçerli değil.');
    }
    const policy = await this.policies.get(professional.branchId);
    const dates = this.generateDates(dto);
    const lastAllowed = this.shiftDate(
      todayInBranch(),
      policy.bookingWindowDays,
    );
    const occurrences = [];
    for (let index = 0; index < dates.length; index += 1) {
      const date = dates[index];
      let available = false;
      let message: string | null = null;
      if (date > lastAllowed || date < todayInBranch()) {
        message = 'Online rezervasyon aralığının dışında.';
      } else {
        try {
          const result = await this.availability.getForBranch(
            professional.branch.slug,
            {
              date,
              serviceIds: dto.serviceId,
              professionalId: dto.professionalId,
            },
          );
          available = result.slots.some(
            (slot) => slot.startTime === dto.startTime,
          );
          if (!available) message = 'Seçilen saat uygun değil.';
        } catch (error) {
          message =
            error instanceof Error ? error.message : 'Uygunluk doğrulanamadı.';
        }
      }
      occurrences.push({
        index: index + 1,
        date,
        startTime: dto.startTime,
        available,
        message,
      });
    }
    return {
      canCreate: occurrences.every((item) => item.available),
      occurrences,
    };
  }

  async createCustomer(customerId: string, dto: CreateBookingSeriesDto) {
    const preview = await this.previewCustomer(customerId, dto);
    if (!preview.canCreate) {
      throw new ConflictException({
        message:
          'Serideki tüm tarihler uygun olmalıdır. Çakışan tarihleri değiştirin.',
        occurrences: preview.occurrences,
      });
    }
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: dto.professionalId },
      include: { branch: true },
    });
    const dates = this.generateDates(dto);
    const idempotencyKey = `${customerId}:${dto.idempotencyKey.trim()}`;

    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, professional.branchId);
      const existing = await transaction.bookingSeries.findUnique({
        where: { idempotencyKey },
        include: { bookings: { orderBy: { occurrenceIndex: 'asc' } } },
      });
      if (existing) return this.toDto(existing);

      const series = await transaction.bookingSeries.create({
        data: {
          branchId: professional.branchId,
          customerId,
          professionalId: professional.id,
          frequency: dto.frequency,
          startsOn: this.dateValue(dates[0]),
          endsOn: this.dateValue(dates.at(-1)!),
          occurrenceCount: dates.length,
          createdByActorType: AuditActorType.CUSTOMER,
          idempotencyKey,
        },
      });
      const bookings = [];
      for (let index = 0; index < dates.length; index += 1) {
        const selection = await this.resolver.resolveSelection(
          professional.branchId,
          professional.id,
          [dto.serviceId],
          'public',
          transaction,
        );
        const startAt = toBranchDateTime(dates[index], dto.startTime);
        const endAt = new Date(
          startAt.getTime() + selection.totalDurationMinutes * 60_000,
        );
        const occupancySegments = this.resolver.buildAbsoluteOccupancy(
          professional.id,
          startAt,
          selection.services,
        );
        await this.schedule.assertAvailable(transaction, {
          branchId: professional.branchId,
          professionalId: professional.id,
          startAt,
          endAt,
          occupancySegments,
        });
        const booking = await transaction.booking.create({
          data: {
            publicCode: this.publicCode(),
            branchId: professional.branchId,
            professionalId: professional.id,
            customerId,
            status: BookingStatus.PENDING_APPROVAL,
            source: BookingSource.ONLINE,
            startAt,
            endAt,
            totalDurationMinutes: selection.totalDurationMinutes,
            totalPriceKurus: selection.totalPriceKurus,
            customerNameSnapshot: customer.fullName,
            customerPhoneSnapshot: customer.phone,
            notificationsEnabled: customer.smsNotificationsEnabled,
            visitStatus: VisitStatus.SCHEDULED,
            visitStatusUpdatedAt: new Date(),
            seriesId: series.id,
            occurrenceIndex: index + 1,
            items: {
              create: selection.services.map((service, itemIndex) =>
                this.resolver.toBookingItemCreate(service, itemIndex),
              ),
            },
            occupancySegments: { create: occupancySegments },
          },
        });
        await this.outbox.enqueue(
          transaction,
          booking.id,
          NotificationEventType.BOOKING_RECEIVED,
          new Date(),
          `booking:${booking.id}:series-received:v1`,
          {
            bookingRevision: booking.revision,
            appointmentStartAt: booking.startAt,
          },
        );
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: booking.branchId,
            resourceType: 'BOOKING_SERIES',
            resourceId: series.id,
            action: 'OCCURRENCE_CREATED',
          },
        });
        bookings.push(booking);
      }
      await this.audit.write(transaction, {
        branchId: professional.branchId,
        entityType: 'BOOKING_SERIES',
        entityId: series.id,
        action: 'BOOKING_SERIES_CREATED',
        actorType: AuditActorType.CUSTOMER,
        afterData: {
          occurrenceCount: bookings.length,
          professionalId: professional.id,
          frequency: dto.frequency,
        },
      });
      return this.toDto({ ...series, bookings });
    });
  }

  async createAdmin(
    branchId: string,
    adminUserId: string,
    dto: CreateAdminBookingSeriesDto,
  ) {
    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, branchId, isActive: true },
    });
    if (!professional)
      throw new BadRequestException('Uzman seçimi geçerli değil.');
    const phone = normalizeTurkishMobile(dto.phone);
    const dates = this.generateDates(dto);
    const idempotencyKey = `admin:${branchId}:${dto.idempotencyKey.trim()}`;
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, branchId);
      const existing = await transaction.bookingSeries.findUnique({
        where: { idempotencyKey },
        include: { bookings: { orderBy: { occurrenceIndex: 'asc' } } },
      });
      if (existing) return this.toDto(existing);
      const customer = await transaction.customer.upsert({
        where: { phone },
        update: { fullName: dto.fullName.trim() },
        create: { phone, fullName: dto.fullName.trim() },
      });
      const selection = await this.resolver.resolveSelection(
        branchId,
        professional.id,
        [dto.serviceId],
        'admin',
        transaction,
      );
      const series = await transaction.bookingSeries.create({
        data: {
          branchId,
          customerId: customer.id,
          professionalId: professional.id,
          frequency: dto.frequency,
          startsOn: this.dateValue(dates[0]),
          endsOn: this.dateValue(dates.at(-1)!),
          occurrenceCount: dates.length,
          createdByActorType: AuditActorType.ADMIN,
          createdByAdminUserId: adminUserId,
          idempotencyKey,
        },
      });
      const bookings = [];
      for (let index = 0; index < dates.length; index += 1) {
        const startAt = toBranchDateTime(dates[index], dto.startTime);
        if (startAt <= new Date()) {
          throw new BadRequestException('Geçmiş tarihli seri oluşturulamaz.');
        }
        const endAt = new Date(
          startAt.getTime() + selection.totalDurationMinutes * 60_000,
        );
        const occupancySegments = this.resolver.buildAbsoluteOccupancy(
          professional.id,
          startAt,
          selection.services,
        );
        const booking = await transaction.booking.create({
          data: {
            publicCode: this.publicCode(),
            branchId,
            professionalId: professional.id,
            customerId: customer.id,
            status: BookingStatus.CONFIRMED,
            source: BookingSource.PHONE,
            startAt,
            endAt,
            totalDurationMinutes: selection.totalDurationMinutes,
            totalPriceKurus: selection.totalPriceKurus,
            customerNameSnapshot: customer.fullName,
            customerPhoneSnapshot: customer.phone,
            notificationsEnabled: customer.smsNotificationsEnabled,
            visitStatus: VisitStatus.SCHEDULED,
            visitStatusUpdatedAt: new Date(),
            approvedAt: new Date(),
            seriesId: series.id,
            occurrenceIndex: index + 1,
            items: {
              create: selection.services.map((service, itemIndex) =>
                this.resolver.toBookingItemCreate(service, itemIndex),
              ),
            },
            occupancySegments: { create: occupancySegments },
          },
        });
        await this.outbox.enqueue(
          transaction,
          booking.id,
          NotificationEventType.BOOKING_CREATED_BY_ADMIN,
          new Date(),
          `booking:${booking.id}:series-created-by-admin:v1`,
          {
            bookingRevision: booking.revision,
            appointmentStartAt: booking.startAt,
          },
        );
        bookings.push(booking);
      }
      await this.audit.write(transaction, {
        branchId,
        entityType: 'BOOKING_SERIES',
        entityId: series.id,
        action: 'BOOKING_SERIES_CREATED_BY_ADMIN',
        actorType: AuditActorType.ADMIN,
        afterData: {
          adminUserId,
          occurrenceCount: bookings.length,
          professionalId: professional.id,
        },
      });
      return this.toDto({ ...series, bookings });
    });
  }

  async getCustomer(customerId: string, id: string) {
    const series = await this.prisma.bookingSeries.findFirst({
      where: { id, customerId },
      include: {
        professional: true,
        bookings: {
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { occurrenceIndex: 'asc' },
        },
      },
    });
    if (!series) throw new NotFoundException('Randevu serisi bulunamadı.');
    return this.toDto(series);
  }

  async getAdmin(branchId: string, id: string) {
    const series = await this.prisma.bookingSeries.findFirst({
      where: { id, branchId },
      include: {
        professional: true,
        bookings: {
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { occurrenceIndex: 'asc' },
        },
      },
    });
    if (!series) throw new NotFoundException('Randevu serisi bulunamadı.');
    return this.toDto(series);
  }

  async cancelCustomer(customerId: string, id: string, fromOccurrence = 1) {
    const series = await this.prisma.bookingSeries.findFirst({
      where: { id, customerId },
      include: { bookings: true },
    });
    if (!series) throw new NotFoundException('Randevu serisi bulunamadı.');
    const targets = series.bookings.filter(
      (booking) =>
        (booking.occurrenceIndex ?? 0) >= fromOccurrence &&
        booking.startAt > new Date() &&
        (booking.status === BookingStatus.PENDING_APPROVAL ||
          booking.status === BookingStatus.CONFIRMED),
    );
    if (!targets.length) {
      throw new ConflictException('İptal edilebilecek gelecek randevu yok.');
    }
    await this.prisma.$transaction(async (transaction) => {
      await transaction.booking.updateMany({
        where: { id: { in: targets.map((item) => item.id) } },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Randevu serisi müşteri tarafından iptal edildi.',
          revision: { increment: 1 },
        },
      });
      for (const booking of targets) {
        await this.outbox.enqueue(
          transaction,
          booking.id,
          NotificationEventType.BOOKING_CANCELLED,
          new Date(),
          `booking:${booking.id}:series-customer-cancel:r${booking.revision + 1}`,
          {
            bookingRevision: booking.revision + 1,
            appointmentStartAt: booking.startAt,
          },
        );
      }
      if (
        targets.length ===
        series.bookings.filter(
          (booking) =>
            booking.startAt > new Date() &&
            (booking.status === BookingStatus.PENDING_APPROVAL ||
              booking.status === BookingStatus.CONFIRMED),
        ).length
      ) {
        await transaction.bookingSeries.update({
          where: { id },
          data: { status: BookingSeriesStatus.CANCELLED },
        });
      }
      await transaction.slotRecoveryEvent.createMany({
        data: targets.map((booking) => ({
          branchId: booking.branchId,
          startAt: booking.startAt,
          endAt: booking.endAt,
          professionalId: booking.professionalId,
          sourceType: 'BOOKING_SERIES_CANCELLATION',
          sourceId: booking.id,
        })),
      });
      await this.audit.write(transaction, {
        branchId: series.branchId,
        entityType: 'BOOKING_SERIES',
        entityId: series.id,
        action: 'BOOKING_SERIES_FUTURE_CANCELLED',
        actorType: AuditActorType.CUSTOMER,
        afterData: {
          fromOccurrence,
          cancelledBookingIds: targets.map((item) => item.id),
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: series.branchId,
          resourceType: 'BOOKING_SERIES',
          resourceId: series.id,
          action: 'FUTURE_CANCELLED',
        },
      });
    });
    return { cancelled: true, count: targets.length };
  }

  async cancelAdmin(
    branchId: string,
    adminUserId: string,
    id: string,
    fromOccurrence = 1,
  ) {
    const series = await this.prisma.bookingSeries.findFirst({
      where: { id, branchId },
      include: { bookings: true },
    });
    if (!series) throw new NotFoundException('Randevu serisi bulunamadı.');
    const now = new Date();
    const targets = series.bookings.filter(
      (booking) =>
        (booking.occurrenceIndex ?? 0) >= fromOccurrence &&
        booking.startAt > now &&
        (booking.status === BookingStatus.PENDING_APPROVAL ||
          booking.status === BookingStatus.CONFIRMED),
    );
    if (!targets.length) {
      throw new ConflictException('İptal edilebilecek gelecek randevu yok.');
    }
    await this.prisma.$transaction(async (transaction) => {
      for (const booking of targets) {
        await transaction.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: now,
            cancellationReason: 'Randevu serisi salon tarafından iptal edildi.',
            revision: { increment: 1 },
          },
        });
        await this.outbox.enqueue(
          transaction,
          booking.id,
          NotificationEventType.BOOKING_CANCELLED,
          now,
          `booking:${booking.id}:series-admin-cancel:r${booking.revision + 1}`,
          {
            bookingRevision: booking.revision + 1,
            appointmentStartAt: booking.startAt,
          },
        );
        await transaction.slotRecoveryEvent.create({
          data: {
            branchId: booking.branchId,
            startAt: booking.startAt,
            endAt: booking.endAt,
            professionalId: booking.professionalId,
            sourceType: 'BOOKING_SERIES_CANCELLATION',
            sourceId: booking.id,
          },
        });
      }
      const activeFutureCount = series.bookings.filter(
        (booking) =>
          booking.startAt > now &&
          (booking.status === BookingStatus.PENDING_APPROVAL ||
            booking.status === BookingStatus.CONFIRMED) &&
          !targets.some((target) => target.id === booking.id),
      ).length;
      if (!activeFutureCount) {
        await transaction.bookingSeries.update({
          where: { id },
          data: { status: BookingSeriesStatus.CANCELLED },
        });
      }
      await this.audit.write(transaction, {
        branchId,
        entityType: 'BOOKING_SERIES',
        entityId: id,
        action: 'BOOKING_SERIES_FUTURE_CANCELLED_BY_ADMIN',
        actorType: AuditActorType.ADMIN,
        afterData: {
          adminUserId,
          fromOccurrence,
          cancelledBookingIds: targets.map((item) => item.id),
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId,
          resourceType: 'BOOKING_SERIES',
          resourceId: id,
          action: 'FUTURE_CANCELLED',
        },
      });
    });
    return { cancelled: true, count: targets.length };
  }

  private generateDates(dto: PreviewBookingSeriesDto) {
    const dates: string[] = [];
    let current = dto.startDate;
    for (let index = 0; index < dto.occurrenceCount; index += 1) {
      if (dto.frequency === BookingSeriesFrequency.MONTHLY) {
        dates.push(this.shiftMonth(dto.startDate, index));
      } else {
        dates.push(current);
        current = this.shiftDate(
          current,
          dto.frequency === BookingSeriesFrequency.WEEKLY
            ? 7
            : dto.frequency === BookingSeriesFrequency.BIWEEKLY
              ? 14
              : 28,
        );
      }
    }
    return dates;
  }

  private shiftDate(date: string, days: number) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private shiftMonth(date: string, months: number) {
    const [year, month, day] = date.split('-').map(Number);
    const targetMonthStart = new Date(
      Date.UTC(year, month - 1 + months, 1, 12),
    );
    const lastDay = new Date(
      Date.UTC(
        targetMonthStart.getUTCFullYear(),
        targetMonthStart.getUTCMonth() + 1,
        0,
        12,
      ),
    ).getUTCDate();
    targetMonthStart.setUTCDate(Math.min(day, lastDay));
    return targetMonthStart.toISOString().slice(0, 10);
  }

  private dateValue(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private publicCode() {
    return `RI-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  private toDto(series: {
    id: string;
    frequency: BookingSeriesFrequency;
    occurrenceCount: number;
    status: BookingSeriesStatus;
    startsOn: Date;
    endsOn: Date | null;
    professionalId: string;
    bookings: {
      id: string;
      publicCode: string;
      status: BookingStatus;
      startAt: Date;
      endAt: Date;
      occurrenceIndex: number | null;
      isSeriesException: boolean;
    }[];
  }) {
    return {
      id: series.id,
      frequency: series.frequency,
      occurrenceCount: series.occurrenceCount,
      status: series.status,
      startsOn: series.startsOn.toISOString().slice(0, 10),
      endsOn: series.endsOn?.toISOString().slice(0, 10) ?? null,
      professionalId: series.professionalId,
      bookings: series.bookings.map((booking) => ({
        id: booking.id,
        publicCode: booking.publicCode,
        status: booking.status,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        occurrenceIndex: booking.occurrenceIndex,
        isSeriesException: booking.isSeriesException,
      })),
    };
  }
}
