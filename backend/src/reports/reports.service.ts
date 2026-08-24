import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  VisitStatus,
  WaitlistOfferStatus,
} from '@prisma/client';
import { branchDayBounds, toDateKey } from '../common/branch-time';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityCalculationService } from './capacity-calculation.service';
import { GetOperationsReportDto } from './dto/get-operations-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacity: CapacityCalculationService,
  ) {}

  async get(branchId: string, query: GetOperationsReportDto) {
    const { start } = branchDayBounds(query.from);
    const { end } = branchDayBounds(query.to);
    if (end <= start || end.getTime() - start.getTime() > 31 * 86_400_000) {
      throw new BadRequestException(
        'Rapor tarih aralığı en fazla 31 gün olabilir.',
      );
    }
    const where: Prisma.BookingWhereInput = {
      branchId,
      startAt: { gte: start, lt: end },
      ...(query.professionalId ? { professionalId: query.professionalId } : {}),
      ...(query.serviceId
        ? { items: { some: { serviceId: query.serviceId } } }
        : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.visitStatus ? { visitStatus: query.visitStatus } : {}),
    };
    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        status: true,
        source: true,
        visitStatus: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        approvedAt: true,
        totalPriceKurus: true,
        seriesId: true,
        professional: { select: { id: true, name: true } },
        items: { select: { serviceId: true, serviceName: true } },
      },
    });
    const bookingIds = bookings.map((item) => item.id);
    const [waitlistWon, capacity, reviewSummary] = await Promise.all([
      this.prisma.waitlistOffer.count({
        where: {
          branchId,
          status: WaitlistOfferStatus.ACCEPTED,
          acceptedAt: { gte: start, lt: end },
          ...(query.professionalId
            ? { professionalId: query.professionalId }
            : {}),
        },
      }),
      this.capacity.calculate({
        branchId,
        from: query.from,
        to: query.to,
        professionalId: query.professionalId,
        serviceId: query.serviceId,
        bookingIds,
      }),
      this.reviewMetrics(branchId, bookingIds),
    ]);

    const operational = bookings.filter(
      (booking) =>
        booking.status === BookingStatus.PENDING_APPROVAL ||
        booking.status === BookingStatus.CONFIRMED ||
        booking.status === BookingStatus.CANCELLED,
    );
    const byProfessional = new Map(
      capacity.professionals.map((professional) => [
        professional.professionalId,
        {
          id: professional.professionalId,
          name: professional.professionalName,
          count: 0,
          minutes: professional.occupiedMinutes,
          capacityMinutes: professional.capacityMinutes,
          occupancyPercent: professional.occupancyPercent,
        },
      ]),
    );
    const services = new Map<string, { name: string; count: number }>();
    const trend = new Map<string, number>();
    for (const booking of operational) {
      const day = toDateKey(booking.startAt);
      trend.set(day, (trend.get(day) ?? 0) + 1);
      const professional = byProfessional.get(booking.professional.id);
      if (professional) professional.count += 1;
      for (const item of booking.items) {
        const current = services.get(item.serviceId) ?? {
          name: item.serviceName,
          count: 0,
        };
        current.count += 1;
        services.set(item.serviceId, current);
      }
    }
    const approvalDurations = bookings
      .filter((booking) => booking.approvedAt)
      .map(
        (booking) =>
          (booking.approvedAt!.getTime() - booking.createdAt.getTime()) /
          60_000,
      )
      .filter((duration) => duration >= 0);
    const now = new Date();
    const pastConfirmed = operational.filter(
      (item) =>
        item.status === BookingStatus.CONFIRMED &&
        item.endAt <= now &&
        item.visitStatus !== VisitStatus.NO_SHOW,
    );
    const noShow = operational.filter(
      (item) => item.visitStatus === VisitStatus.NO_SHOW,
    );
    const cancelled = operational.filter(
      (item) => item.status === BookingStatus.CANCELLED,
    );
    return {
      range: { from: query.from, to: query.to },
      filters: {
        professionalId: query.professionalId ?? null,
        serviceId: query.serviceId ?? null,
        source: query.source ?? null,
        status: query.status ?? null,
        visitStatus: query.visitStatus ?? null,
      },
      totals: {
        appointments: operational.length,
        pending: operational.filter(
          (item) => item.status === BookingStatus.PENDING_APPROVAL,
        ).length,
        confirmed: operational.filter(
          (item) => item.status === BookingStatus.CONFIRMED,
        ).length,
        past: pastConfirmed.length,
        cancelled: cancelled.length,
        noShow: noShow.length,
        waitlistWon,
        capacityMinutes: capacity.capacityMinutes,
        occupiedMinutes: capacity.occupiedMinutes,
        occupancyPercent: capacity.occupancyPercent,
        averageApprovalMinutes: approvalDurations.length
          ? Math.round(
              approvalDurations.reduce((sum, value) => sum + value, 0) /
                approvalDurations.length,
            )
          : null,
        noShowRate: this.ratio(noShow.length, operational.length),
        cancellationRate: this.ratio(cancelled.length, operational.length),
        recurringBookingRate: this.ratio(
          operational.filter((item) => Boolean(item.seriesId)).length,
          operational.length,
        ),
        estimatedPastServiceValueKurus: pastConfirmed.reduce(
          (sum, item) => sum + item.totalPriceKurus,
          0,
        ),
        plannedServiceValueKurus: operational
          .filter(
            (item) =>
              item.status === BookingStatus.CONFIRMED && item.startAt > now,
          )
          .reduce((sum, item) => sum + item.totalPriceKurus, 0),
        ...reviewSummary,
      },
      professionals: [...byProfessional.values()],
      services: [...services.entries()]
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => b.count - a.count),
      trend: [...trend.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  private async reviewMetrics(branchId: string, bookingIds: string[]) {
    if (!bookingIds.length) {
      return {
        averageRating: 0,
        reviewResponseRate: 0,
        reviewDistribution: [5, 4, 3, 2, 1].map((rating) => ({
          rating,
          count: 0,
        })),
      };
    }
    const reviews = await this.prisma.bookingReview.findMany({
      where: { branchId, bookingId: { in: bookingIds } },
      select: {
        rating: true,
        submittedAt: true,
        requestSentAt: true,
      },
    });
    const submitted = reviews.filter((item) => item.submittedAt && item.rating);
    const requested = reviews.filter((item) => item.requestSentAt);
    const distribution = new Map<number, number>();
    for (const review of submitted) {
      distribution.set(
        review.rating!,
        (distribution.get(review.rating!) ?? 0) + 1,
      );
    }
    return {
      averageRating: submitted.length
        ? Math.round(
            (submitted.reduce((sum, item) => sum + item.rating!, 0) /
              submitted.length) *
              100,
          ) / 100
        : 0,
      reviewResponseRate: this.ratio(submitted.length, requested.length),
      reviewDistribution: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: distribution.get(rating) ?? 0,
      })),
    };
  }

  private ratio(value: number, total: number) {
    return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
  }
}
