import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { ProfessionalAvailabilityService } from '../availability/professional-availability.service';
import {
  branchDayBounds,
  minuteToLabel,
  toBranchDateTime,
} from '../common/branch-time';
import { PrismaService } from '../prisma/prisma.service';

type AbsoluteInterval = { startAt: Date; endAt: Date };

export type ProfessionalCapacity = {
  professionalId: string;
  professionalName: string;
  capacityMinutes: number;
  occupiedMinutes: number;
  occupancyPercent: number;
};

@Injectable()
export class CapacityCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ProfessionalAvailabilityService,
  ) {}

  async calculate(input: {
    branchId: string;
    from: string;
    to: string;
    professionalId?: string;
    serviceId?: string;
    bookingIds?: string[];
  }) {
    const { start } = branchDayBounds(input.from);
    const { end } = branchDayBounds(input.to);
    const professionals = await this.prisma.professional.findMany({
      where: {
        branchId: input.branchId,
        isActive: true,
        ...(input.professionalId ? { id: input.professionalId } : {}),
        ...(input.serviceId
          ? { services: { some: { serviceId: input.serviceId } } }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });
    if (!professionals.length) {
      return {
        capacityMinutes: 0,
        occupiedMinutes: 0,
        occupancyPercent: 0,
        professionals: [] as ProfessionalCapacity[],
      };
    }

    const professionalIds = professionals.map((item) => item.id);
    const [blocks, occupancy] = await Promise.all([
      this.prisma.scheduleBlock.findMany({
        where: {
          branchId: input.branchId,
          cancelledAt: null,
          startAt: { lt: end },
          endAt: { gt: start },
          OR: [
            { professionalId: null },
            { professionalId: { in: professionalIds } },
          ],
        },
        select: {
          professionalId: true,
          startAt: true,
          endAt: true,
        },
      }),
      this.prisma.bookingOccupancySegment.findMany({
        where: {
          professionalId: { in: professionalIds },
          startAt: { lt: end },
          endAt: { gt: start },
          booking: {
            branchId: input.branchId,
            status: {
              in: [BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED],
            },
            ...(input.bookingIds ? { id: { in: input.bookingIds } } : {}),
            ...(input.serviceId
              ? { items: { some: { serviceId: input.serviceId } } }
              : {}),
          },
        },
        select: {
          professionalId: true,
          startAt: true,
          endAt: true,
        },
      }),
    ]);

    const results: ProfessionalCapacity[] = [];
    for (const professional of professionals) {
      const capacitySegments: AbsoluteInterval[] = [];
      for (const date of this.dateKeys(input.from, input.to)) {
        const working = await this.availability.resolveEffectiveIntervals(
          input.branchId,
          professional.id,
          date,
        );
        const dayIntervals = working.map((interval) => ({
          startAt: toBranchDateTime(date, minuteToLabel(interval.startMinute)),
          endAt: toBranchDateTime(date, minuteToLabel(interval.endMinute)),
        }));
        const relevantBlocks = blocks
          .filter(
            (block) =>
              block.professionalId === null ||
              block.professionalId === professional.id,
          )
          .map(({ startAt, endAt }) => ({ startAt, endAt }));
        capacitySegments.push(
          ...this.subtract(dayIntervals, this.merge(relevantBlocks)),
        );
      }
      const mergedCapacity = this.merge(capacitySegments);
      const capacityMinutes = this.minutes(mergedCapacity);
      const occupiedSegments = this.merge(
        occupancy
          .filter((item) => item.professionalId === professional.id)
          .flatMap((item) =>
            this.intersections(
              [{ startAt: item.startAt, endAt: item.endAt }],
              mergedCapacity,
            ),
          ),
      );
      const occupiedMinutes = this.minutes(occupiedSegments);
      results.push({
        professionalId: professional.id,
        professionalName: professional.name,
        capacityMinutes,
        occupiedMinutes,
        occupancyPercent: this.percent(occupiedMinutes, capacityMinutes),
      });
    }

    const capacityMinutes = results.reduce(
      (sum, item) => sum + item.capacityMinutes,
      0,
    );
    const occupiedMinutes = results.reduce(
      (sum, item) => sum + item.occupiedMinutes,
      0,
    );
    return {
      capacityMinutes,
      occupiedMinutes,
      occupancyPercent: this.percent(occupiedMinutes, capacityMinutes),
      professionals: results,
    };
  }

  private dateKeys(from: string, to: string) {
    const values: string[] = [];
    const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
    const [toYear, toMonth, toDay] = to.split('-').map(Number);
    const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
    const last = Date.UTC(toYear, toMonth - 1, toDay);
    while (cursor.getTime() <= last) {
      values.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return values;
  }

  private subtract(
    sources: AbsoluteInterval[],
    exclusions: AbsoluteInterval[],
  ) {
    return sources.flatMap((source) => {
      let pieces = [source];
      for (const exclusion of exclusions) {
        pieces = pieces.flatMap((piece) => {
          if (
            exclusion.endAt <= piece.startAt ||
            exclusion.startAt >= piece.endAt
          ) {
            return [piece];
          }
          const next: AbsoluteInterval[] = [];
          if (exclusion.startAt > piece.startAt) {
            next.push({
              startAt: piece.startAt,
              endAt:
                exclusion.startAt < piece.endAt
                  ? exclusion.startAt
                  : piece.endAt,
            });
          }
          if (exclusion.endAt < piece.endAt) {
            next.push({
              startAt:
                exclusion.endAt > piece.startAt
                  ? exclusion.endAt
                  : piece.startAt,
              endAt: piece.endAt,
            });
          }
          return next;
        });
      }
      return pieces;
    });
  }

  private intersections(left: AbsoluteInterval[], right: AbsoluteInterval[]) {
    return left.flatMap((a) =>
      right
        .map((b) => ({
          startAt: a.startAt > b.startAt ? a.startAt : b.startAt,
          endAt: a.endAt < b.endAt ? a.endAt : b.endAt,
        }))
        .filter((item) => item.startAt < item.endAt),
    );
  }

  private merge(intervals: AbsoluteInterval[]) {
    const sorted = intervals
      .filter((item) => item.startAt < item.endAt)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const merged: AbsoluteInterval[] = [];
    for (const interval of sorted) {
      const previous = merged.at(-1);
      if (!previous || interval.startAt > previous.endAt) {
        merged.push({ ...interval });
      } else if (interval.endAt > previous.endAt) {
        previous.endAt = interval.endAt;
      }
    }
    return merged;
  }

  private minutes(intervals: AbsoluteInterval[]) {
    return Math.round(
      intervals.reduce(
        (sum, item) =>
          sum + (item.endAt.getTime() - item.startAt.getTime()) / 60_000,
        0,
      ),
    );
  }

  private percent(value: number, total: number) {
    return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
  }
}
