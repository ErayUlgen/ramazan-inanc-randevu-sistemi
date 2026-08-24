import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingSource,
  BookingStatus,
  NotificationEventType,
  NotificationStatus,
  Prisma,
  VisitStatus,
  AdminRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import {
  toBranchDateTime,
  toDateKey,
  todayInBranch,
} from '../common/branch-time';
import { lockBranchSchedule } from '../common/schedule-lock';
import { normalizeTurkishMobile } from '../common/phone';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminBookingDto } from './dto/create-admin-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { UpdateBookingDetailsDto } from './dto/update-booking-details.dto';
import { MarkNoShowDto } from './dto/mark-no-show.dto';
import { RevertNoShowDto } from './dto/revert-no-show.dto';
import { ProfessionalServiceResolver } from '../scheduling/professional-service-resolver.service';
import { AdminIdentity } from '../admin/admin-session.service';
import { FormsService } from '../forms/forms.service';

const INCLUDE = {
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
} satisfies Prisma.BookingInclude;

type BookingRecord = Prisma.BookingGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class BookingOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: ScheduleValidationService,
    private readonly outbox: NotificationOutboxService,
    private readonly audit: OperationsAuditService,
    private readonly serviceResolver: ProfessionalServiceResolver,
    private readonly forms: FormsService,
  ) {}

  async create(dto: CreateAdminBookingDto) {
    if (dto.source === BookingSource.ONLINE) {
      throw new BadRequestException(
        'Online kaynak yalnız müşteri rezervasyon akışında kullanılabilir.',
      );
    }
    const branch = await this.prisma.branch.findUnique({
      where: { slug: dto.branchSlug },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');
    if (dto.source === BookingSource.PHONE && !dto.phone?.trim()) {
      throw new BadRequestException('Telefon randevusunda telefon zorunludur.');
    }
    if (dto.source === BookingSource.WALK_IN && dto.date !== todayInBranch()) {
      throw new BadRequestException(
        'Salondan gelen müşteri yalnız bugünün akışına eklenebilir.',
      );
    }
    const phone = dto.phone?.trim() ? normalizeTurkishMobile(dto.phone) : null;
    const notificationsEnabled = Boolean(phone && dto.notificationsEnabled);
    const { services, professional, duration, price } =
      await this.loadSelection(branch.id, dto.serviceIds, dto.professionalId);
    const startAt = toBranchDateTime(dto.date, dto.startTime);
    const endAt = new Date(startAt.getTime() + duration * 60_000);
    const occupancySegments = this.serviceResolver.buildAbsoluteOccupancy(
      professional.id,
      startAt,
      services,
    );
    if (startAt <= new Date()) {
      throw new BadRequestException('Geçmiş bir saate randevu oluşturulamaz.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockBranchSchedule(transaction, branch.id);
        const customer = phone
          ? await transaction.customer.upsert({
              where: { phone },
              update: {},
              create: { fullName: dto.fullName.trim(), phone },
            })
          : null;
        const booking = await transaction.booking.create({
          data: {
            publicCode: this.publicCode(),
            branchId: branch.id,
            professionalId: professional.id,
            customerId: customer?.id,
            status: BookingStatus.CONFIRMED,
            source: dto.source,
            startAt,
            endAt,
            totalDurationMinutes: duration,
            totalPriceKurus: price,
            customerNameSnapshot: dto.fullName.trim(),
            customerPhoneSnapshot: phone,
            customerNote: dto.customerNote?.trim() || null,
            adminNote: dto.adminNote?.trim() || null,
            notificationsEnabled,
            visitStatus: VisitStatus.SCHEDULED,
            visitStatusUpdatedAt: new Date(),
            approvedAt: new Date(),
            items: {
              create: services.map((service, index) =>
                this.serviceResolver.toBookingItemCreate(service, index),
              ),
            },
            occupancySegments: { create: occupancySegments },
          },
          include: INCLUDE,
        });
        await this.forms?.assignRequiredForms(transaction, {
          branchId: branch.id,
          bookingId: booking.id,
          customerId: customer?.id,
          serviceIds: booking.items.map((item) => item.serviceId),
        });
        await this.audit.write(transaction, {
          branchId: branch.id,
          bookingId: booking.id,
          entityType: 'BOOKING',
          entityId: booking.id,
          action: 'BOOKING_CREATED_BY_ADMIN',
          actorType: AuditActorType.ADMIN,
          afterData: this.auditSnapshot(booking),
        });
        if (notificationsEnabled) {
          await this.outbox.enqueue(
            transaction,
            booking.id,
            NotificationEventType.BOOKING_CREATED_BY_ADMIN,
            new Date(),
            `booking:${booking.id}:admin-created:r${booking.revision}:v1`,
            {
              bookingRevision: booking.revision,
              appointmentStartAt: booking.startAt,
              payload: {
                startAt: booking.startAt.toISOString(),
                professionalName: booking.professional.name,
              },
            },
          );
        }
        return this.toDto(booking);
      });
    } catch (error) {
      this.rethrowOverlap(error);
    }
  }

  async previewReschedule(id: string, dto: RescheduleBookingDto) {
    const existing = await this.requireBooking(id);
    if (
      existing.status !== BookingStatus.CONFIRMED ||
      existing.startAt <= new Date()
    ) {
      throw new ConflictException(
        'Yalnız gelecekteki onaylı randevular taşınabilir.',
      );
    }
    if (existing.revision !== dto.expectedRevision) throw this.stale();
    const { services, professional, duration, price } =
      await this.loadSelection(
        existing.branchId,
        dto.serviceIds,
        dto.professionalId,
      );
    const startAt = toBranchDateTime(dto.date, dto.startTime);
    const endAt = new Date(startAt.getTime() + duration * 60_000);
    const occupancySegments = this.serviceResolver.buildAbsoluteOccupancy(
      professional.id,
      startAt,
      services,
    );
    try {
      await this.prisma.$transaction((transaction) =>
        this.schedule.assertAvailable(transaction, {
          branchId: existing.branchId,
          professionalId: professional.id,
          startAt,
          endAt,
          occupancySegments,
          excludeBookingId: id,
        }),
      );
      return {
        valid: true,
        requiresOverride: false,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        professional: {
          id: professional.id,
          name: professional.name,
        },
        totalDurationMinutes: duration,
        totalPriceKurus: price,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          valid: false,
          requiresOverride: true,
          reason:
            typeof error.getResponse() === 'string'
              ? error.getResponse()
              : 'Seçilen zaman normal çalışma kurallarıyla çakışıyor.',
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        };
      }
      throw error;
    }
  }

  async reschedule(
    id: string,
    dto: RescheduleBookingDto,
    identity?: AdminIdentity,
  ) {
    const existing = await this.requireBooking(id);
    if (
      existing.status !== BookingStatus.CONFIRMED ||
      existing.startAt <= new Date()
    ) {
      throw new ConflictException(
        'Yalnız gelecekteki onaylı randevular taşınabilir.',
      );
    }
    const { services, professional, duration, price } =
      await this.loadSelection(
        existing.branchId,
        dto.serviceIds,
        dto.professionalId,
      );
    const startAt = toBranchDateTime(dto.date, dto.startTime);
    const endAt = new Date(startAt.getTime() + duration * 60_000);
    const occupancySegments = this.serviceResolver.buildAbsoluteOccupancy(
      professional.id,
      startAt,
      services,
    );
    if (startAt <= new Date()) {
      throw new BadRequestException('Randevu geçmiş bir saate taşınamaz.');
    }
    if (
      dto.allowOverride &&
      (!dto.overrideReason || dto.overrideReason.trim().length < 5)
    ) {
      throw new BadRequestException(
        'Takvim istisnası için kısa bir yönetici gerekçesi yazın.',
      );
    }
    if (toDateKey(startAt) !== toDateKey(new Date(endAt.getTime() - 1))) {
      throw new BadRequestException(
        'Randevu aynı salon günü içinde tamamlanmalıdır.',
      );
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockBranchSchedule(transaction, existing.branchId);
        const current = await transaction.booking.findUnique({
          where: { id },
          include: INCLUDE,
        });
        if (
          !current ||
          current.revision !== dto.expectedRevision ||
          current.status !== BookingStatus.CONFIRMED
        ) {
          throw this.stale();
        }
        if (!dto.allowOverride) {
          await this.schedule.assertAvailable(transaction, {
            branchId: current.branchId,
            professionalId: professional.id,
            startAt,
            endAt,
            occupancySegments,
            excludeBookingId: id,
          });
        }
        const nextRevision = current.revision + 1;
        await transaction.bookingItem.deleteMany({ where: { bookingId: id } });
        await transaction.bookingOccupancySegment.deleteMany({
          where: { bookingId: id },
        });
        const updated = await transaction.booking.update({
          where: { id },
          data: {
            professionalId: professional.id,
            startAt,
            endAt,
            totalDurationMinutes: duration,
            totalPriceKurus: price,
            isSeriesException: current.seriesId
              ? true
              : current.isSeriesException,
            scheduleOverride: Boolean(dto.allowOverride),
            overrideReason: dto.allowOverride
              ? dto.overrideReason?.trim()
              : null,
            overrideByAdminUserId: dto.allowOverride
              ? (identity?.userId ?? null)
              : null,
            revision: nextRevision,
            items: {
              create: services.map((service, index) =>
                this.serviceResolver.toBookingItemCreate(service, index),
              ),
            },
            occupancySegments: { create: occupancySegments },
          },
          include: INCLUDE,
        });
        await transaction.bookingNotification.updateMany({
          where: {
            bookingId: id,
            eventType: NotificationEventType.BOOKING_REMINDER,
            status: {
              in: [
                NotificationStatus.PENDING,
                NotificationStatus.RETRY_SCHEDULED,
              ],
            },
          },
          data: {
            status: NotificationStatus.SKIPPED,
            lastErrorCode: 'BOOKING_RESCHEDULED',
            lastErrorMessage:
              'Randevu taşındığı için önceki saate ait hatırlatma geçersiz.',
          },
        });
        await this.audit.write(transaction, {
          branchId: current.branchId,
          bookingId: id,
          entityType: 'BOOKING',
          entityId: id,
          action: 'BOOKING_RESCHEDULED',
          actorType: AuditActorType.ADMIN,
          adminUserId: identity?.userId,
          actorLabel: identity?.displayName,
          beforeData: this.auditSnapshot(current),
          afterData: this.auditSnapshot(updated),
          reason: dto.allowOverride ? dto.overrideReason?.trim() : undefined,
        });
        await transaction.slotRecoveryEvent.create({
          data: {
            branchId: current.branchId,
            startAt: current.startAt,
            endAt: current.endAt,
            professionalId: current.professionalId,
            sourceType: 'BOOKING_RESCHEDULE',
            sourceId: `${id}:r${current.revision}`,
          },
        });
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: current.branchId,
            resourceType: 'BOOKING',
            resourceId: id,
            action: 'BOOKING_RESCHEDULED',
          },
        });
        if (updated.notificationsEnabled && updated.customerPhoneSnapshot) {
          await this.outbox.enqueue(
            transaction,
            id,
            NotificationEventType.BOOKING_RESCHEDULED,
            new Date(),
            `booking:${id}:rescheduled:r${nextRevision}:v1`,
            {
              bookingRevision: nextRevision,
              appointmentStartAt: startAt,
              payload: {
                oldStartAt: current.startAt.toISOString(),
                newStartAt: startAt.toISOString(),
                oldProfessionalName: current.professional.name,
                newProfessionalName: updated.professional.name,
              },
            },
          );
        }
        return this.toDto(updated);
      });
    } catch (error) {
      this.rethrowOverlap(error);
    }
  }

  async updateDetails(id: string, dto: UpdateBookingDetailsDto) {
    const existing = await this.requireBooking(id);
    const phone = dto.phone?.trim() ? normalizeTurkishMobile(dto.phone) : null;
    if (
      !phone &&
      (existing.source === BookingSource.ONLINE ||
        existing.source === BookingSource.PHONE)
    ) {
      throw new BadRequestException(
        'Online ve telefon randevularında telefon boş bırakılamaz.',
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, existing.branchId);
      const current = await transaction.booking.findUnique({
        where: { id },
        include: INCLUDE,
      });
      if (!current || current.revision !== dto.expectedRevision) {
        throw this.stale();
      }
      const customer = phone
        ? await transaction.customer.upsert({
            where: { phone },
            update: {},
            create: { phone, fullName: dto.fullName.trim() },
          })
        : null;
      const updated = await transaction.booking.update({
        where: { id },
        data: {
          customerId: customer?.id ?? null,
          customerNameSnapshot: dto.fullName.trim(),
          customerPhoneSnapshot: phone,
          customerNote: dto.customerNote?.trim() || null,
          adminNote: dto.adminNote?.trim() || null,
          notificationsEnabled: Boolean(phone && dto.notificationsEnabled),
          revision: { increment: 1 },
        },
        include: INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId: current.branchId,
        bookingId: id,
        entityType: 'BOOKING',
        entityId: id,
        action: 'BOOKING_DETAILS_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: this.auditSnapshot(current),
        afterData: this.auditSnapshot(updated),
      });
      return this.toDto(updated);
    });
  }

  async markNoShow(id: string, dto: MarkNoShowDto, actor?: AdminIdentity) {
    const existing = await this.requireBooking(id);
    if (
      actor?.role === AdminRole.PROFESSIONAL &&
      existing.professionalId !== actor.professionalId
    ) {
      throw new ForbiddenException(
        'Başka bir uzmanın randevusu güncellenemez.',
      );
    }
    if (existing.status !== BookingStatus.CONFIRMED) {
      throw new ConflictException(
        'Yalnızca onaylı bir randevu gelmedi olarak işaretlenebilir.',
      );
    }
    if (existing.startAt > new Date()) {
      throw new ConflictException(
        'Randevu saati gelmeden müşteri gelmedi olarak işaretlenemez.',
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.booking.findUnique({
        where: { id },
        include: { review: true },
      });
      if (
        !current ||
        current.revision !== dto.expectedRevision ||
        current.status !== BookingStatus.CONFIRMED
      ) {
        throw this.stale();
      }
      if (current.startAt > new Date()) {
        throw new ConflictException(
          'Randevu saati gelmeden müşteri gelmedi olarak işaretlenemez.',
        );
      }
      if (current.visitStatus === VisitStatus.NO_SHOW) {
        throw new ConflictException(
          'Bu randevu zaten gelmedi olarak işaretlenmiş.',
        );
      }
      if (current.review?.submittedAt) {
        throw new ConflictException(
          'Bu randevu için değerlendirme gönderildiğinden standart gelmedi işlemi kullanılamaz.',
        );
      }
      const updated = await transaction.booking.update({
        where: { id },
        data: {
          visitStatus: VisitStatus.NO_SHOW,
          visitStatusUpdatedAt: new Date(),
          revision: { increment: 1 },
        },
        include: INCLUDE,
      });
      await transaction.bookingNotification.updateMany({
        where: {
          bookingId: id,
          eventType: NotificationEventType.REVIEW_REQUESTED,
          status: {
            in: [
              NotificationStatus.PENDING,
              NotificationStatus.RETRY_SCHEDULED,
              NotificationStatus.PROCESSING,
            ],
          },
        },
        data: {
          status: NotificationStatus.CANCELLED,
          processingStartedAt: null,
          lastErrorCode: 'BOOKING_NO_SHOW',
          lastErrorMessage:
            'Randevu gelmedi olarak işaretlendiği için değerlendirme daveti iptal edildi.',
        },
      });
      if (current.review && !current.review.submittedAt) {
        await transaction.bookingReview.delete({
          where: { id: current.review.id },
        });
      }
      await this.audit.write(transaction, {
        branchId: current.branchId,
        bookingId: id,
        entityType: 'BOOKING',
        entityId: id,
        action: 'BOOKING_MARKED_NO_SHOW',
        actorType: AuditActorType.ADMIN,
        adminUserId: actor?.userId,
        actorLabel: actor?.displayName,
        beforeData: { visitStatus: current.visitStatus },
        afterData: { visitStatus: updated.visitStatus },
        reason: dto.note?.trim() || undefined,
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: current.branchId,
          resourceType: 'BOOKING',
          resourceId: id,
          action: 'BOOKING_MARKED_NO_SHOW',
        },
      });
      return this.toDto(updated);
    });
  }

  async revertNoShow(id: string, dto: RevertNoShowDto, actor?: AdminIdentity) {
    const existing = await this.requireBooking(id);
    if (
      actor?.role === AdminRole.PROFESSIONAL &&
      existing.professionalId !== actor.professionalId
    ) {
      throw new ForbiddenException(
        'Başka bir uzmanın randevusu güncellenemez.',
      );
    }
    if (
      existing.status !== BookingStatus.CONFIRMED ||
      existing.visitStatus !== VisitStatus.NO_SHOW
    ) {
      throw new ConflictException(
        'Yalnızca gelmedi olarak işaretlenmiş bir randevu geri alınabilir.',
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.booking.findUnique({ where: { id } });
      if (
        !current ||
        current.revision !== dto.expectedRevision ||
        current.status !== BookingStatus.CONFIRMED ||
        current.visitStatus !== VisitStatus.NO_SHOW
      ) {
        throw this.stale();
      }
      const updated = await transaction.booking.update({
        where: { id },
        data: {
          visitStatus: VisitStatus.SCHEDULED,
          visitStatusUpdatedAt: new Date(),
          revision: { increment: 1 },
        },
        include: INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId: current.branchId,
        bookingId: id,
        entityType: 'BOOKING',
        entityId: id,
        action: 'BOOKING_NO_SHOW_REVERTED',
        actorType: AuditActorType.ADMIN,
        adminUserId: actor?.userId,
        actorLabel: actor?.displayName,
        beforeData: { visitStatus: current.visitStatus },
        afterData: { visitStatus: updated.visitStatus },
        reason: dto.reason.trim(),
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: current.branchId,
          resourceType: 'BOOKING',
          resourceId: id,
          action: 'BOOKING_NO_SHOW_REVERTED',
        },
      });
      return this.toDto(updated);
    });
  }

  private async loadSelection(
    branchId: string,
    rawServiceIds: string[],
    professionalId: string,
  ) {
    const selection = await this.serviceResolver.resolveSelection(
      branchId,
      professionalId,
      rawServiceIds,
      'admin',
    );
    return {
      services: selection.services,
      professional: selection.professional,
      duration: selection.totalDurationMinutes,
      price: selection.totalPriceKurus,
    };
  }

  private requireBooking(id: string) {
    return this.prisma.booking
      .findUnique({ where: { id }, include: INCLUDE })
      .then((booking) => {
        if (!booking) throw new NotFoundException('Randevu bulunamadı.');
        return booking;
      });
  }

  private auditSnapshot(booking: BookingRecord) {
    return {
      source: booking.source,
      status: booking.status,
      visitStatus: booking.visitStatus,
      seriesId: booking.seriesId,
      occurrenceIndex: booking.occurrenceIndex,
      isSeriesException: booking.isSeriesException,
      professionalId: booking.professionalId,
      professionalName: booking.professional.name,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      totalDurationMinutes: booking.totalDurationMinutes,
      totalPriceKurus: booking.totalPriceKurus,
      serviceNames: booking.items.map((item) => item.serviceName),
      notificationsEnabled: booking.notificationsEnabled,
      scheduleOverride: booking.scheduleOverride,
      overrideReason: booking.overrideReason,
      revision: booking.revision,
    };
  }

  private toDto(booking: BookingRecord) {
    return {
      id: booking.id,
      publicCode: booking.publicCode,
      status: booking.status,
      source: booking.source,
      visitStatus: booking.visitStatus,
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
    };
  }

  private publicCode() {
    return `RI-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  private stale() {
    return new ConflictException(
      'Randevu başka bir işlemde güncellendi. Son veriyi yükleyip tekrar deneyin.',
    );
  }

  private rethrowOverlap(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('booking_no_overlap') ||
      message.includes('exclusion constraint')
    ) {
      throw new ConflictException(
        'Bu saat başka bir randevu tarafından az önce dolduruldu.',
      );
    }
    throw error;
  }
}
