import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingChangeRequestStatus,
  BookingStatus,
  NotificationEventType,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import { BookingPolicyService } from '../booking-policy/booking-policy.service';
import { toBranchDateTime } from '../common/branch-time';
import { lockBranchSchedule } from '../common/schedule-lock';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingChangeRequestDto } from './dto/create-booking-change-request.dto';
import { CustomerCancelBookingDto } from './dto/customer-cancel-booking.dto';
import { DecideBookingChangeRequestDto } from './dto/decide-booking-change-request.dto';
import {
  EffectiveProfessionalService,
  ProfessionalServiceResolver,
} from '../scheduling/professional-service-resolver.service';

const CHANGE_INCLUDE = {
  booking: {
    include: {
      branch: true,
      customer: true,
      professional: true,
      items: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
  requestedProfessional: true,
  occupancySegments: true,
} satisfies Prisma.BookingChangeRequestInclude;

type ChangeRecord = Prisma.BookingChangeRequestGetPayload<{
  include: typeof CHANGE_INCLUDE;
}>;

@Injectable()
export class BookingChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly schedule: ScheduleValidationService,
    private readonly policies: BookingPolicyService,
    private readonly outbox: NotificationOutboxService,
    private readonly audit: OperationsAuditService,
    private readonly serviceResolver: ProfessionalServiceResolver,
  ) {}

  async customerAvailability(
    bookingId: string,
    query: { date: string; professionalId?: string },
  ) {
    const booking = await this.requireBooking(bookingId);
    return this.availability.getForBookingChange({
      branchSlug: booking.branch.slug,
      date: query.date,
      serviceIds: booking.items.map((item) => item.serviceId).join(','),
      professionalId: query.professionalId,
      excludeBookingId: booking.id,
    });
  }

  async createForCustomer(
    bookingId: string,
    dto: CreateBookingChangeRequestDto,
  ) {
    const booking = await this.requireBooking(bookingId);
    const now = new Date();
    if (
      !this.isCustomerManageableStatus(booking.status) ||
      booking.startAt <= now
    ) {
      throw new ConflictException(
        'Bu randevu için saat değişikliği talep edilemez.',
      );
    }
    if (booking.revision !== dto.expectedRevision) throw this.stale();
    const policy = await this.policies.get(booking.branchId);
    if (
      booking.startAt.getTime() - now.getTime() <
      policy.rescheduleLeadMinutes * 60_000
    ) {
      throw new ConflictException(
        `Randevuya ${policy.rescheduleLeadMinutes} dakikadan az kaldığı için online değişiklik yapılamaz.`,
      );
    }
    const selection = await this.serviceResolver.resolveSelection(
      booking.branchId,
      dto.professionalId,
      booking.items.map((item) => item.serviceId),
      'public',
    );
    const startAt = toBranchDateTime(dto.date, dto.startTime);
    const endAt = new Date(
      startAt.getTime() + selection.totalDurationMinutes * 60_000,
    );
    const occupancySegments = this.serviceResolver.buildAbsoluteOccupancy(
      selection.professional.id,
      startAt,
      selection.services,
    );
    if (startAt <= now) {
      throw new BadRequestException('Geçmiş bir saat talep edilemez.');
    }

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        await lockBranchSchedule(transaction, booking.branchId);
        await transaction.bookingChangeRequest.updateMany({
          where: {
            bookingId,
            status: BookingChangeRequestStatus.PENDING,
            expiresAt: { lte: now },
          },
          data: {
            status: BookingChangeRequestStatus.EXPIRED,
            decidedAt: now,
            decisionReason: 'Talebin süresi doldu.',
          },
        });
        const current = await transaction.booking.findUnique({
          where: { id: bookingId },
        });
        if (
          !current ||
          current.revision !== dto.expectedRevision ||
          !this.isCustomerManageableStatus(current.status)
        ) {
          throw this.stale();
        }
        const activeCount = await transaction.bookingChangeRequest.count({
          where: {
            bookingId,
            status: BookingChangeRequestStatus.PENDING,
            expiresAt: { gt: now },
          },
        });
        if (activeCount >= policy.maxActiveChangeRequests) {
          throw new ConflictException(
            'Bu randevu için zaten değerlendirmede olan bir değişiklik talebi var.',
          );
        }
        await this.schedule.assertAvailable(transaction, {
          branchId: booking.branchId,
          professionalId: selection.professional.id,
          startAt,
          endAt,
          occupancySegments,
          excludeBookingId: bookingId,
        });
        const request = await transaction.bookingChangeRequest.create({
          data: {
            branchId: booking.branchId,
            bookingId,
            requestedProfessionalId: selection.professional.id,
            requestedStartAt: startAt,
            requestedEndAt: endAt,
            requestedTotalDurationMinutes: selection.totalDurationMinutes,
            requestedTotalPriceKurus: selection.totalPriceKurus,
            serviceSnapshot:
              selection.services as unknown as Prisma.InputJsonValue,
            bookingRevision: current.revision,
            reason: dto.reason?.trim() || null,
            expiresAt: new Date(
              now.getTime() + policy.changeRequestTtlMinutes * 60_000,
            ),
            occupancySegments: { create: occupancySegments },
          },
          include: CHANGE_INCLUDE,
        });
        await this.audit.write(transaction, {
          branchId: booking.branchId,
          bookingId,
          entityType: 'BOOKING_CHANGE_REQUEST',
          entityId: request.id,
          action: 'CHANGE_REQUEST_CREATED',
          actorType: AuditActorType.CUSTOMER,
          afterData: this.snapshot(request),
          reason: dto.reason,
        });
        if (booking.notificationsEnabled) {
          await this.outbox.enqueue(
            transaction,
            bookingId,
            NotificationEventType.CHANGE_REQUEST_RECEIVED,
            now,
            `booking:${bookingId}:change:${request.id}:received:v1`,
            {
              bookingRevision: current.revision,
              appointmentStartAt: current.startAt,
              payload: {
                requestedStartAt: startAt.toISOString(),
                requestedProfessionalName: selection.professional.name,
              },
            },
          );
        }
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: booking.branchId,
            resourceType: 'BOOKING_CHANGE_REQUEST',
            resourceId: request.id,
            action: 'CREATED',
          },
        });
        return request;
      });
      return this.toDto(created);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async cancelForCustomer(bookingId: string, dto: CustomerCancelBookingDto) {
    const booking = await this.requireBooking(bookingId);
    const now = new Date();
    if (
      !this.isCustomerManageableStatus(booking.status) ||
      booking.startAt <= now
    ) {
      throw new ConflictException('Bu randevu online olarak iptal edilemez.');
    }
    const policy = await this.policies.get(booking.branchId);
    const late =
      booking.startAt.getTime() - now.getTime() <
      policy.cancellationLeadMinutes * 60_000;
    if (late && !policy.allowLateCancellation) {
      throw new ConflictException(
        'Online iptal süresi geçti. Lütfen salonla iletişime geçin.',
      );
    }
    await this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, booking.branchId);
      const updated = await transaction.booking.updateMany({
        where: {
          id: bookingId,
          status: {
            in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL],
          },
          startAt: { gt: now },
          revision: booking.revision,
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: dto.reason.trim(),
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw this.stale();
      await transaction.bookingChangeRequest.updateMany({
        where: {
          bookingId,
          status: BookingChangeRequestStatus.PENDING,
        },
        data: {
          status: BookingChangeRequestStatus.CANCELLED,
          decidedAt: now,
          decisionReason: 'Randevu müşteri tarafından iptal edildi.',
        },
      });
      await transaction.bookingNotification.updateMany({
        where: {
          bookingId,
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
          lastErrorMessage: 'Randevu iptal edildiği için bildirim geçersiz.',
        },
      });
      await this.outbox.enqueue(
        transaction,
        bookingId,
        NotificationEventType.BOOKING_CANCELLED,
        now,
        `booking:${bookingId}:customer-cancelled:r${booking.revision + 1}:v1`,
        {
          bookingRevision: booking.revision + 1,
          appointmentStartAt: booking.startAt,
          payload: { actor: 'CUSTOMER', late },
        },
      );
      await this.audit.write(transaction, {
        branchId: booking.branchId,
        bookingId,
        entityType: 'BOOKING',
        entityId: bookingId,
        action: late
          ? 'BOOKING_CANCELLED_LATE_BY_CUSTOMER'
          : 'BOOKING_CANCELLED_BY_CUSTOMER',
        actorType: AuditActorType.CUSTOMER,
        beforeData: { status: booking.status, revision: booking.revision },
        afterData: {
          status: BookingStatus.CANCELLED,
          revision: booking.revision + 1,
          late,
        },
        reason: dto.reason,
      });
      await transaction.slotRecoveryEvent.create({
        data: {
          branchId: booking.branchId,
          startAt: booking.startAt,
          endAt: booking.endAt,
          professionalId: booking.professionalId,
          sourceType: 'BOOKING_CANCELLATION',
          sourceId: bookingId,
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: booking.branchId,
          resourceType: 'BOOKING',
          resourceId: bookingId,
          action: 'CUSTOMER_CANCELLED',
        },
      });
    });
    return { cancelled: true, late };
  }

  async list(branchId: string, status?: BookingChangeRequestStatus) {
    await this.expireDue(branchId);
    const items = await this.prisma.bookingChangeRequest.findMany({
      where: { branchId, ...(status ? { status } : {}) },
      include: CHANGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return items.map((item) => this.toDto(item));
  }

  async decide(id: string, dto: DecideBookingChangeRequestDto) {
    const existing = await this.prisma.bookingChangeRequest.findUnique({
      where: { id },
      include: CHANGE_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Değişiklik talebi bulunamadı.');
    if (existing.status !== BookingChangeRequestStatus.PENDING) {
      throw new ConflictException('Bu değişiklik talebi artık beklemiyor.');
    }
    if (dto.decision === 'REJECT') {
      return this.reject(existing, dto.reason);
    }
    return this.approve(existing, dto.reason);
  }

  private async approve(existing: ChangeRecord, reason?: string) {
    const now = new Date();
    if (existing.expiresAt <= now) {
      await this.expireDue(existing.branchId);
      throw new ConflictException('Değişiklik talebinin süresi doldu.');
    }
    try {
      const result = await this.prisma.$transaction(async (transaction) => {
        await lockBranchSchedule(transaction, existing.branchId);
        const request = await transaction.bookingChangeRequest.findUnique({
          where: { id: existing.id },
          include: CHANGE_INCLUDE,
        });
        if (
          !request ||
          request.status !== BookingChangeRequestStatus.PENDING ||
          request.expiresAt <= now ||
          request.booking.revision !== request.bookingRevision ||
          !this.isCustomerManageableStatus(request.booking.status)
        ) {
          throw this.stale();
        }
        await this.schedule.assertAvailable(transaction, {
          branchId: request.branchId,
          professionalId: request.requestedProfessionalId,
          startAt: request.requestedStartAt,
          endAt: request.requestedEndAt,
          occupancySegments: request.occupancySegments.map((segment) => ({
            professionalId: segment.professionalId,
            startAt: segment.startAt,
            endAt: segment.endAt,
            kind: segment.kind,
          })),
          excludeBookingId: request.bookingId,
        });
        await transaction.bookingChangeRequest.update({
          where: { id: request.id },
          data: {
            status: BookingChangeRequestStatus.APPROVED,
            decidedAt: now,
            decisionReason: reason?.trim() || null,
          },
        });
        const nextRevision = request.booking.revision + 1;
        const serviceSnapshot = this.readServiceSnapshot(request);
        await transaction.bookingItem.deleteMany({
          where: { bookingId: request.bookingId },
        });
        await transaction.bookingOccupancySegment.deleteMany({
          where: { bookingId: request.bookingId },
        });
        const updatedBooking = await transaction.booking.update({
          where: { id: request.bookingId },
          data: {
            professionalId: request.requestedProfessionalId,
            startAt: request.requestedStartAt,
            endAt: request.requestedEndAt,
            totalDurationMinutes:
              request.requestedTotalDurationMinutes ??
              request.booking.totalDurationMinutes,
            totalPriceKurus:
              request.requestedTotalPriceKurus ??
              request.booking.totalPriceKurus,
            isSeriesException: request.booking.seriesId
              ? true
              : request.booking.isSeriesException,
            revision: nextRevision,
            items: {
              create: serviceSnapshot.map((service, index) =>
                this.serviceResolver.toBookingItemCreate(service, index),
              ),
            },
            occupancySegments: {
              create: request.occupancySegments.map((segment) => ({
                professionalId: segment.professionalId,
                startAt: segment.startAt,
                endAt: segment.endAt,
                kind: segment.kind,
              })),
            },
          },
        });
        await transaction.bookingNotification.updateMany({
          where: {
            bookingId: request.bookingId,
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
              'Randevu değiştirildiği için önceki bildirim geçersiz.',
          },
        });
        await this.outbox.enqueue(
          transaction,
          request.bookingId,
          NotificationEventType.CHANGE_REQUEST_APPROVED,
          now,
          `booking:${request.bookingId}:change:${request.id}:approved:r${nextRevision}:v1`,
          {
            bookingRevision: nextRevision,
            appointmentStartAt: request.requestedStartAt,
            payload: {
              oldStartAt: request.booking.startAt.toISOString(),
              requestedStartAt: request.requestedStartAt.toISOString(),
              requestedProfessionalName: request.requestedProfessional.name,
            },
          },
        );
        await this.audit.write(transaction, {
          branchId: request.branchId,
          bookingId: request.bookingId,
          entityType: 'BOOKING_CHANGE_REQUEST',
          entityId: request.id,
          action: 'CHANGE_REQUEST_APPROVED',
          actorType: AuditActorType.ADMIN,
          beforeData: this.snapshot(request),
          afterData: {
            status: BookingChangeRequestStatus.APPROVED,
            bookingRevision: nextRevision,
          },
          reason,
        });
        await transaction.slotRecoveryEvent.create({
          data: {
            branchId: request.branchId,
            startAt: request.booking.startAt,
            endAt: request.booking.endAt,
            professionalId: request.booking.professionalId,
            sourceType: 'BOOKING_CHANGE',
            sourceId: request.id,
          },
        });
        await transaction.adminRealtimeEvent.create({
          data: {
            branchId: request.branchId,
            resourceType: 'BOOKING_CHANGE_REQUEST',
            resourceId: request.id,
            action: 'APPROVED',
          },
        });
        return { request, updatedBooking };
      });
      return {
        ...this.toDto({
          ...result.request,
          status: BookingChangeRequestStatus.APPROVED,
          decidedAt: now,
          decisionReason: reason?.trim() || null,
        }),
        bookingRevision: result.updatedBooking.revision,
      };
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private async reject(existing: ChangeRecord, reason?: string) {
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.bookingChangeRequest.updateMany({
        where: {
          id: existing.id,
          status: BookingChangeRequestStatus.PENDING,
        },
        data: {
          status: BookingChangeRequestStatus.REJECTED,
          decidedAt: new Date(),
          decisionReason: reason?.trim() || null,
        },
      });
      if (result.count !== 1) throw this.stale();
      await this.outbox.enqueue(
        transaction,
        existing.bookingId,
        NotificationEventType.CHANGE_REQUEST_REJECTED,
        new Date(),
        `booking:${existing.bookingId}:change:${existing.id}:rejected:v1`,
        {
          bookingRevision: existing.bookingRevision,
          appointmentStartAt: existing.booking.startAt,
          payload: {
            requestedStartAt: existing.requestedStartAt.toISOString(),
          },
        },
      );
      await this.audit.write(transaction, {
        branchId: existing.branchId,
        bookingId: existing.bookingId,
        entityType: 'BOOKING_CHANGE_REQUEST',
        entityId: existing.id,
        action: 'CHANGE_REQUEST_REJECTED',
        actorType: AuditActorType.ADMIN,
        beforeData: this.snapshot(existing),
        afterData: { status: BookingChangeRequestStatus.REJECTED },
        reason,
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: existing.branchId,
          resourceType: 'BOOKING_CHANGE_REQUEST',
          resourceId: existing.id,
          action: 'REJECTED',
        },
      });
      return transaction.bookingChangeRequest.findUniqueOrThrow({
        where: { id: existing.id },
        include: CHANGE_INCLUDE,
      });
    });
    return this.toDto(updated);
  }

  async expireDue(branchId?: string) {
    const now = new Date();
    return this.prisma.$transaction(async (transaction) => {
      const due = await transaction.bookingChangeRequest.findMany({
        where: {
          ...(branchId ? { branchId } : {}),
          status: BookingChangeRequestStatus.PENDING,
          expiresAt: { lte: now },
        },
        select: { id: true, branchId: true, bookingId: true },
      });
      if (!due.length) return 0;
      await transaction.bookingChangeRequest.updateMany({
        where: { id: { in: due.map((item) => item.id) } },
        data: {
          status: BookingChangeRequestStatus.EXPIRED,
          decidedAt: now,
          decisionReason: 'Talebin süresi doldu.',
        },
      });
      await transaction.adminRealtimeEvent.createMany({
        data: due.map((item) => ({
          branchId: item.branchId,
          resourceType: 'BOOKING_CHANGE_REQUEST',
          resourceId: item.id,
          action: 'EXPIRED',
        })),
      });
      return due.length;
    });
  }

  private async requireBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        branch: true,
        customer: true,
        professional: true,
        items: { orderBy: { sortOrder: 'asc' } },
        changeRequests: {
          orderBy: { createdAt: 'desc' },
          include: { requestedProfessional: true },
          take: 10,
        },
      },
    });
    if (!booking?.customer) throw new NotFoundException('Randevu bulunamadı.');
    return booking;
  }

  private snapshot(request: ChangeRecord) {
    return {
      status: request.status,
      bookingRevision: request.bookingRevision,
      requestedProfessionalId: request.requestedProfessionalId,
      requestedStartAt: request.requestedStartAt.toISOString(),
      requestedEndAt: request.requestedEndAt.toISOString(),
      expiresAt: request.expiresAt.toISOString(),
    };
  }

  private readServiceSnapshot(
    request: ChangeRecord,
  ): EffectiveProfessionalService[] {
    if (Array.isArray(request.serviceSnapshot)) {
      return request.serviceSnapshot as unknown as EffectiveProfessionalService[];
    }
    return request.booking.items.map((item) => ({
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      sortOrder: item.sortOrder,
      durationMinutes: item.durationMinutes,
      priceKurus: item.priceKurus,
      isOnlineBookable: true,
      bufferBeforeMinutes: item.bufferBeforeMinutes,
      bufferAfterMinutes: item.bufferAfterMinutes,
      processingStartOffsetMinutes: item.processingStartOffsetMinutes,
      processingDurationMinutes: item.processingDurationMinutes,
      preVisitInstructions: item.preVisitInstructionsSnapshot,
      postVisitInstructions: item.postVisitInstructionsSnapshot,
      salonDurationMinutes: item.durationMinutes,
      salonPriceKurus: item.priceKurus,
    }));
  }

  private toDto(request: ChangeRecord) {
    return {
      id: request.id,
      bookingId: request.bookingId,
      publicCode: request.booking.publicCode,
      status: request.status,
      bookingRevision: request.bookingRevision,
      currentStartAt: request.booking.startAt.toISOString(),
      currentEndAt: request.booking.endAt.toISOString(),
      currentProfessional: {
        id: request.booking.professional.id,
        name: request.booking.professional.name,
      },
      requestedStartAt: request.requestedStartAt.toISOString(),
      requestedEndAt: request.requestedEndAt.toISOString(),
      requestedProfessional: {
        id: request.requestedProfessional.id,
        name: request.requestedProfessional.name,
      },
      customer: {
        fullName:
          request.booking.customerNameSnapshot ??
          request.booking.customer?.fullName ??
          'Müşteri',
        phone:
          request.booking.customerPhoneSnapshot ??
          request.booking.customer?.phone ??
          '',
      },
      serviceNames: request.booking.items.map((item) => item.serviceName),
      reason: request.reason,
      decisionReason: request.decisionReason,
      expiresAt: request.expiresAt.toISOString(),
      decidedAt: request.decidedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private stale() {
    return new ConflictException(
      'Kayıt başka bir işlemde güncellendi. Son veriyi yükleyip tekrar deneyin.',
    );
  }

  private isCustomerManageableStatus(status: BookingStatus) {
    return (
      status === BookingStatus.PENDING_APPROVAL ||
      status === BookingStatus.CONFIRMED
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
      message.includes('booking_change_requests_one_pending') ||
      message.includes('booking_change_requests_no_pending_overlap') ||
      message.includes('exclusion constraint')
    ) {
      throw new ConflictException(
        'Bu saat az önce başka bir talep tarafından tutuldu. Yeni bir saat seçin.',
      );
    }
    throw error;
  }
}
