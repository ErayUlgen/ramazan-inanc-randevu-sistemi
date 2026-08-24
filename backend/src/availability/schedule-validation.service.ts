import { ConflictException, Injectable } from '@nestjs/common';
import { BookingOccupancyKind, BookingStatus, Prisma } from '@prisma/client';
import { minuteOfDay, toDateKey } from '../common/branch-time';
import { AbsoluteOccupancySegment } from '../scheduling/professional-service-resolver.service';
import { ProfessionalAvailabilityService } from './professional-availability.service';

const BLOCKING_STATUSES: BookingStatus[] = [
  BookingStatus.HOLD,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class ScheduleValidationService {
  constructor(
    private readonly professionalAvailability: ProfessionalAvailabilityService,
  ) {}

  async assertAvailable(
    transaction: Prisma.TransactionClient,
    input: {
      branchId: string;
      professionalId: string;
      startAt: Date;
      endAt: Date;
      occupancySegments?: AbsoluteOccupancySegment[];
      excludeBookingId?: string;
      excludeWaitlistOfferId?: string;
      enforceWorkingHours?: boolean;
    },
  ): Promise<void> {
    const {
      branchId,
      professionalId,
      startAt,
      endAt,
      occupancySegments,
      excludeBookingId,
      excludeWaitlistOfferId,
      enforceWorkingHours = true,
    } = input;
    const segments = occupancySegments?.length
      ? occupancySegments
      : [
          {
            professionalId,
            startAt,
            endAt,
            kind: BookingOccupancyKind.SERVICE,
          },
        ];
    const date = toDateKey(startAt);
    if (date !== toDateKey(new Date(endAt.getTime() - 1))) {
      throw new ConflictException(
        'Randevu aynı salon günü içinde tamamlanmalıdır.',
      );
    }

    if (enforceWorkingHours) {
      const working =
        await this.professionalAvailability.resolveEffectiveIntervals(
          branchId,
          professionalId,
          date,
          transaction,
        );
      const intervals = [
        { startAt, endAt },
        ...segments.map((segment) => ({
          startAt: segment.startAt,
          endAt: segment.endAt,
        })),
      ];
      if (
        intervals.some((interval) => {
          if (
            toDateKey(interval.startAt) !==
            toDateKey(new Date(interval.endAt.getTime() - 1))
          ) {
            return true;
          }
          const intervalStart = minuteOfDay(interval.startAt);
          const intervalEnd = minuteOfDay(interval.endAt);
          return !working.some(
            (candidate) =>
              intervalStart >= candidate.startMinute &&
              intervalEnd <= candidate.endMinute,
          );
        })
      ) {
        throw new ConflictException(
          'Seçilen zaman salonun çalışma saatlerinin dışında.',
        );
      }
    }

    const overlapWhere = segments.map((segment) => ({
      startAt: { lt: segment.endAt },
      endAt: { gt: segment.startAt },
    }));
    const occupancyDelegate = transaction.bookingOccupancySegment;
    const changeOccupancyDelegate = transaction.bookingChangeOccupancySegment;
    const offerOccupancyDelegate = transaction.waitlistOfferOccupancySegment;
    const [
      occupancyConflict,
      legacyBookingConflict,
      blockConflict,
      changeOccupancyConflict,
      legacyChangeConflict,
      offerOccupancyConflict,
      legacyOfferConflict,
    ] = await Promise.all([
      occupancyDelegate?.findFirst
        ? occupancyDelegate.findFirst({
            where: {
              professionalId,
              bookingId: excludeBookingId
                ? { not: excludeBookingId }
                : undefined,
              booking: { status: { in: BLOCKING_STATUSES } },
              OR: overlapWhere,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      transaction.booking.findFirst({
        where: {
          professionalId,
          id: excludeBookingId ? { not: excludeBookingId } : undefined,
          status: { in: BLOCKING_STATUSES },
          occupancySegments: { none: {} },
          ...(overlapWhere.length === 1
            ? overlapWhere[0]
            : { OR: overlapWhere }),
        },
        select: { id: true },
      }),
      transaction.scheduleBlock.findFirst({
        where: {
          branchId,
          cancelledAt: null,
          OR: [{ professionalId }, { professionalId: null }],
          AND:
            overlapWhere.length === 1
              ? [overlapWhere[0]]
              : [{ OR: overlapWhere }],
        },
        select: { id: true },
      }),
      changeOccupancyDelegate?.findFirst
        ? changeOccupancyDelegate.findFirst({
            where: {
              professionalId,
              changeRequest: {
                status: 'PENDING',
                expiresAt: { gt: new Date() },
              },
              OR: overlapWhere,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      transaction.bookingChangeRequest.findFirst({
        where: {
          requestedProfessionalId: professionalId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
          occupancySegments: { none: {} },
          OR: segments.map((segment) => ({
            requestedStartAt: { lt: segment.endAt },
            requestedEndAt: { gt: segment.startAt },
          })),
        },
        select: { id: true },
      }),
      offerOccupancyDelegate?.findFirst
        ? offerOccupancyDelegate.findFirst({
            where: {
              professionalId,
              waitlistOfferId: excludeWaitlistOfferId
                ? { not: excludeWaitlistOfferId }
                : undefined,
              waitlistOffer: {
                status: 'PENDING',
                expiresAt: { gt: new Date() },
              },
              OR: overlapWhere,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      transaction.waitlistOffer.findFirst({
        where: {
          id: excludeWaitlistOfferId
            ? { not: excludeWaitlistOfferId }
            : undefined,
          professionalId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
          occupancySegments: { none: {} },
          OR: overlapWhere,
        },
        select: { id: true },
      }),
    ]);

    if (
      occupancyConflict ||
      legacyBookingConflict ||
      blockConflict ||
      changeOccupancyConflict ||
      legacyChangeConflict ||
      offerOccupancyConflict ||
      legacyOfferConflict
    ) {
      throw new ConflictException(
        'Bu saat başka bir randevu veya zaman bloğu tarafından az önce dolduruldu. Takvimi yenileyip farklı bir saat seçin.',
      );
    }
  }
}
