import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminRole,
  AuditActorType,
  BookingStatus,
  ReviewSource,
  VisitStatus,
} from '@prisma/client';
import { createActionToken, hashActionToken } from '../common/action-token';
import { AdminIdentity } from '../admin/admin-session.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async publicStatus(token: string) {
    const review = await this.findByToken(token);
    this.assertPublicUsable(review);
    return this.toCustomerDto(review);
  }

  async submitPublic(token: string, dto: SubmitReviewDto) {
    const review = await this.findByToken(token);
    this.assertPublicUsable(review);
    return this.submit(review.id, dto, ReviewSource.PUBLIC_LINK);
  }

  async customerStatus(customerId: string, publicCode: string) {
    const review = await this.ensureCustomerReview(customerId, publicCode);
    return this.toCustomerDto(review);
  }

  async submitCustomer(
    customerId: string,
    publicCode: string,
    dto: SubmitReviewDto,
  ) {
    const review = await this.ensureCustomerReview(customerId, publicCode);
    return this.submit(review.id, dto, ReviewSource.CUSTOMER_ACCOUNT);
  }

  async listAdmin(
    identity: AdminIdentity,
    query: {
      cursor?: string;
      professionalId?: string;
      rating?: number;
      unread?: string;
      from?: string;
      to?: string;
    },
  ) {
    const professionalId =
      identity.role === AdminRole.PROFESSIONAL
        ? (identity.professionalId ?? '__unassigned__')
        : query.professionalId;
    const reviews = await this.prisma.bookingReview.findMany({
      where: {
        branchId: identity.branchId,
        submittedAt: { not: null },
        ...(professionalId ? { professionalId } : {}),
        ...(query.rating ? { rating: query.rating } : {}),
        ...(query.unread === 'true' ? { adminReadAt: null } : {}),
        ...(query.from || query.to
          ? {
              submittedAt: {
                ...(query.from
                  ? { gte: new Date(`${query.from}T00:00:00+03:00`) }
                  : {}),
                ...(query.to
                  ? { lt: new Date(`${query.to}T23:59:59.999+03:00`) }
                  : {}),
              },
            }
          : {}),
      },
      include: this.include(),
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      take: 21,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const page = reviews.slice(0, 20);
    return {
      items: page.map((review) => this.toAdminDto(review)),
      nextCursor: reviews.length > 20 ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async summary(
    identity: AdminIdentity,
    query: { from?: string; to?: string; professionalId?: string } = {},
  ) {
    const professionalId =
      identity.role === AdminRole.PROFESSIONAL
        ? (identity.professionalId ?? '__unassigned__')
        : query.professionalId;
    const submittedRange =
      query.from || query.to
        ? {
            ...(query.from
              ? { gte: new Date(`${query.from}T00:00:00+03:00`) }
              : {}),
            ...(query.to
              ? { lt: new Date(`${query.to}T23:59:59.999+03:00`) }
              : {}),
          }
        : undefined;
    const where = {
      branchId: identity.branchId,
      submittedAt: submittedRange
        ? { not: null as Date | null, ...submittedRange }
        : { not: null as Date | null },
      ...(professionalId ? { professionalId } : {}),
    };
    const [
      submitted,
      requested,
      grouped,
      unread,
      byProfessional,
      professionals,
    ] = await Promise.all([
      this.prisma.bookingReview.count({ where }),
      this.prisma.bookingReview.count({
        where: {
          branchId: identity.branchId,
          requestSentAt: submittedRange
            ? { not: null, ...submittedRange }
            : { not: null },
          ...(professionalId ? { professionalId } : {}),
        },
      }),
      this.prisma.bookingReview.groupBy({
        by: ['rating'],
        where,
        _count: { _all: true },
        _avg: { rating: true },
      }),
      this.prisma.bookingReview.count({
        where: { ...where, adminReadAt: null },
      }),
      this.prisma.bookingReview.groupBy({
        by: ['professionalId'],
        where,
        _count: { _all: true },
        _avg: { rating: true },
      }),
      this.prisma.professional.findMany({
        where: {
          branchId: identity.branchId,
          isActive: true,
          ...(professionalId && professionalId !== '__unassigned__'
            ? { id: professionalId }
            : {}),
        },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);
    const ratingCounts = new Map(
      grouped.map((item) => [item.rating ?? 0, item._count._all]),
    );
    const totalRating = grouped.reduce(
      (sum, item) => sum + (item.rating ?? 0) * item._count._all,
      0,
    );
    const professionalStats = new Map(
      byProfessional.map((item) => [
        item.professionalId,
        {
          reviewCount: item._count._all,
          averageRating: item._avg.rating ?? 0,
        },
      ]),
    );
    return {
      submitted,
      requested,
      unread,
      responseRate: requested ? submitted / requested : 0,
      averageRating: submitted ? totalRating / submitted : 0,
      distribution: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: ratingCounts.get(rating) ?? 0,
      })),
      professionals: professionals.map((professional) => ({
        professionalId: professional.id,
        professionalName: professional.name,
        reviewCount: professionalStats.get(professional.id)?.reviewCount ?? 0,
        averageRating:
          professionalStats.get(professional.id)?.averageRating ?? 0,
      })),
    };
  }

  async updateAdmin(identity: AdminIdentity, id: string, dto: UpdateReviewDto) {
    const review = await this.prisma.bookingReview.findFirst({
      where: {
        id,
        branchId: identity.branchId,
        submittedAt: { not: null },
        ...(identity.role === AdminRole.PROFESSIONAL
          ? { professionalId: identity.professionalId ?? '__unassigned__' }
          : {}),
      },
    });
    if (!review) throw this.notFound();
    if (identity.role === AdminRole.PROFESSIONAL) {
      throw new ConflictException(
        'Uzman hesabı değerlendirme notunu değiştiremez.',
      );
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const value = await transaction.bookingReview.update({
        where: { id },
        data: {
          adminReadAt: dto.markRead ? new Date() : review.adminReadAt,
          adminNote:
            dto.adminNote === undefined
              ? review.adminNote
              : dto.adminNote.trim() || null,
        },
        include: this.include(),
      });
      await this.audit.write(transaction, {
        branchId: review.branchId,
        bookingId: review.bookingId,
        entityType: 'BOOKING_REVIEW',
        entityId: review.id,
        action: 'REVIEW_ADMIN_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: {
          adminReadAt: review.adminReadAt?.toISOString() ?? null,
          adminNote: review.adminNote,
        },
        afterData: {
          adminReadAt: value.adminReadAt?.toISOString() ?? null,
          adminNote: value.adminNote,
        },
      });
      return value;
    });
    return this.toAdminDto(updated);
  }

  private async submit(
    reviewId: string,
    dto: SubmitReviewDto,
    source: ReviewSource,
  ) {
    const now = new Date();
    const result = await this.prisma.$transaction(async (transaction) => {
      const review = await transaction.bookingReview.findUnique({
        where: { id: reviewId },
        include: this.include(),
      });
      if (!review) throw this.notFound();
      this.assertReviewAvailable(review);
      if (review.submittedAt) {
        throw new ConflictException(
          'Bu randevu için değerlendirme zaten gönderildi.',
        );
      }
      const professionalId = review.booking.professionalId;
      const claimed = await transaction.bookingReview.updateMany({
        where: { id: review.id, submittedAt: null },
        data: {
          professionalId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          source,
          submittedAt: now,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'Bu randevu için değerlendirme zaten gönderildi.',
        );
      }
      const updated = await transaction.bookingReview.findUniqueOrThrow({
        where: { id: review.id },
        include: this.include(),
      });
      await this.audit.write(transaction, {
        branchId: review.branchId,
        bookingId: review.bookingId,
        entityType: 'BOOKING_REVIEW',
        entityId: review.id,
        action: 'REVIEW_SUBMITTED',
        actorType: AuditActorType.CUSTOMER,
        afterData: { rating: dto.rating, source, professionalId },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: review.branchId,
          resourceType: 'BOOKING_REVIEW',
          resourceId: review.id,
          action: 'SUBMITTED',
        },
      });
      return updated;
    });
    const policy = await this.prisma.branchBookingPolicy.findUnique({
      where: { branchId: result.branchId },
      select: { googleReviewUrl: true },
    });
    return {
      submitted: true,
      review: this.toCustomerDto(result),
      googleReviewUrl: policy?.googleReviewUrl ?? null,
    };
  }

  private async ensureCustomerReview(customerId: string, publicCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        customerId,
        publicCode: publicCode.trim().toUpperCase(),
      },
      include: { review: { include: this.include() } },
    });
    if (!booking) throw this.notFound();
    const policy = await this.prisma.branchBookingPolicy.findUnique({
      where: { branchId: booking.branchId },
    });
    const availableAt = new Date(
      booking.endAt.getTime() +
        (policy?.reviewRequestDelayMinutes ?? 30) * 60_000,
    );
    if (
      booking.status !== BookingStatus.CONFIRMED ||
      booking.visitStatus === VisitStatus.NO_SHOW ||
      policy?.reviewRequestEnabled === false ||
      availableAt > new Date()
    ) {
      throw new ConflictException(
        `Değerlendirme anketi randevu bittikten ${policy?.reviewRequestDelayMinutes ?? 30} dakika sonra açılır.`,
      );
    }
    if (booking.review) return booking.review;
    const token = createActionToken();
    return this.prisma.bookingReview.upsert({
      where: { bookingId: booking.id },
      update: {},
      create: {
        bookingId: booking.id,
        customerId,
        branchId: booking.branchId,
        professionalId: booking.professionalId,
        requestTokenHash: hashActionToken(token),
        requestExpiresAt: new Date(
          availableAt.getTime() +
            (policy?.reviewRequestExpiryDays ?? 30) * 24 * 60 * 60_000,
        ),
      },
      include: this.include(),
    });
  }

  private findByToken(token: string) {
    if (!token || token.length < 32) return Promise.reject(this.notFound());
    return this.prisma.bookingReview
      .findUnique({
        where: { requestTokenHash: hashActionToken(token) },
        include: this.include(),
      })
      .then((review) => {
        if (!review) throw this.notFound();
        return review;
      });
  }

  private assertPublicUsable(
    review: Awaited<ReturnType<ReviewsService['findByToken']>>,
  ) {
    this.assertReviewAvailable(review);
    if (review.requestExpiresAt <= new Date()) {
      throw new ConflictException('Değerlendirme bağlantısının süresi doldu.');
    }
  }

  private assertReviewAvailable(
    review: Awaited<ReturnType<ReviewsService['findByToken']>>,
  ) {
    const delayMinutes =
      review.branch.bookingPolicy?.reviewRequestDelayMinutes ?? 30;
    const availableAt = new Date(
      review.booking.endAt.getTime() + delayMinutes * 60_000,
    );
    if (
      review.booking.status !== BookingStatus.CONFIRMED ||
      review.booking.visitStatus === VisitStatus.NO_SHOW ||
      review.branch.bookingPolicy?.reviewRequestEnabled === false ||
      availableAt > new Date()
    ) {
      throw new ConflictException(
        `Değerlendirme anketi randevu bittikten ${delayMinutes} dakika sonra açılır.`,
      );
    }
  }

  private include() {
    return {
      booking: {
        include: {
          customer: true,
          professional: true,
          items: { orderBy: { sortOrder: 'asc' as const } },
        },
      },
      professional: true,
      customer: true,
      branch: {
        include: {
          bookingPolicy: true,
          professionals: {
            select: { id: true, name: true, title: true },
            orderBy: { sortOrder: 'asc' as const },
          },
        },
      },
    } as const;
  }

  private toCustomerDto(
    review: Awaited<ReturnType<ReviewsService['findByToken']>>,
  ) {
    return {
      id: review.id,
      publicCode: review.booking.publicCode,
      rating: review.rating,
      comment: review.comment,
      submittedAt: review.submittedAt?.toISOString() ?? null,
      expiresAt: review.requestExpiresAt.toISOString(),
      professional: {
        id: review.professional.id,
        name: review.professional.name,
      },
      availableAt: new Date(
        review.booking.endAt.getTime() +
          (review.branch.bookingPolicy?.reviewRequestDelayMinutes ?? 30) *
            60_000,
      ).toISOString(),
      services: review.booking.items.map((item) => item.serviceName),
      visitAt: review.booking.startAt.toISOString(),
    };
  }

  private toAdminDto(
    review: Awaited<ReturnType<ReviewsService['findByToken']>>,
  ) {
    return {
      ...this.toCustomerDto(review),
      customer: {
        id: review.customer?.id ?? null,
        fullName:
          review.customer?.fullName ??
          review.booking.customerNameSnapshot ??
          'Müşteri',
      },
      adminReadAt: review.adminReadAt?.toISOString() ?? null,
      adminNote: review.adminNote,
    };
  }

  private notFound() {
    return new NotFoundException('Değerlendirme bulunamadı.');
  }
}
