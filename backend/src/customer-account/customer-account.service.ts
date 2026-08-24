import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { BookingChangeRequestsService } from '../booking-changes/booking-change-requests.service';
import { CustomerCancelBookingDto } from '../booking-changes/dto/customer-cancel-booking.dto';
import { CreateBookingChangeRequestDto } from '../booking-changes/dto/create-booking-change-request.dto';
import { GetBookingChangeAvailabilityDto } from '../booking-access/dto/get-booking-change-availability.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerBookingView,
  type ListCustomerBookingsDto,
} from './dto/list-customer-bookings.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

const PAGE_SIZE = 20;

const SUMMARY_INCLUDE = {
  branch: true,
  professional: true,
  items: { orderBy: { sortOrder: 'asc' as const } },
  changeRequests: {
    where: { status: 'PENDING' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: { requestedProfessional: true },
  },
} satisfies Prisma.BookingInclude;

const DETAIL_INCLUDE = {
  ...SUMMARY_INCLUDE,
  branch: { include: { bookingPolicy: true } },
  review: { select: { submittedAt: true } },
  notifications: { orderBy: { createdAt: 'desc' as const }, take: 30 },
  changeRequests: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: { requestedProfessional: true },
  },
} satisfies Prisma.BookingInclude;

type BookingSummaryRecord = Prisma.BookingGetPayload<{
  include: typeof SUMMARY_INCLUDE;
}>;
type BookingDetailRecord = Prisma.BookingGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

@Injectable()
export class CustomerAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changes: BookingChangeRequestsService,
  ) {}

  profile(customerId: string) {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        smsNotificationsEnabled: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  async updateProfile(customerId: string, dto: UpdateCustomerProfileDto) {
    return this.prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.update({
        where: { id: customerId },
        data: {
          fullName: dto.fullName.trim(),
          email: dto.email?.trim() || null,
          smsNotificationsEnabled: dto.smsNotificationsEnabled,
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          smsNotificationsEnabled: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });
      await transaction.booking.updateMany({
        where: {
          customerId,
          startAt: { gt: new Date() },
          status: {
            in: [BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED],
          },
        },
        data: {
          notificationsEnabled: dto.smsNotificationsEnabled,
          customerNameSnapshot: dto.fullName.trim(),
        },
      });
      return customer;
    });
  }

  async listBookings(customerId: string, query: ListCustomerBookingsDto) {
    const now = new Date();
    const where: Prisma.BookingWhereInput = {
      customerId,
      ...(query.view === CustomerBookingView.PENDING
        ? {
            status: BookingStatus.PENDING_APPROVAL,
            startAt: { gt: now },
          }
        : query.view === CustomerBookingView.UPCOMING
          ? {
              status: BookingStatus.CONFIRMED,
              endAt: { gt: now },
            }
          : {
              status: {
                notIn: [BookingStatus.HOLD, BookingStatus.PENDING_APPROVAL],
              },
              OR: [
                { endAt: { lte: now } },
                {
                  status: {
                    in: [
                      BookingStatus.REJECTED,
                      BookingStatus.CANCELLED,
                      BookingStatus.EXPIRED,
                    ],
                  },
                },
              ],
            }),
    };
    const bookings = await this.prisma.booking.findMany({
      where,
      include: SUMMARY_INCLUDE,
      orderBy:
        query.view === CustomerBookingView.UPCOMING
          ? [{ startAt: 'asc' }, { id: 'asc' }]
          : [{ startAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = bookings.length > PAGE_SIZE;
    const page = bookings.slice(0, PAGE_SIZE);
    return {
      items: page.map((booking) => this.toSummary(booking)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async booking(customerId: string, publicCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        customerId,
        publicCode: publicCode.trim().toUpperCase(),
      },
      include: DETAIL_INCLUDE,
    });
    if (!booking) throw this.notFound();
    return this.toDetail(booking);
  }

  async rebookSuggestion(customerId: string, publicCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        customerId,
        publicCode: publicCode.trim().toUpperCase(),
        status: { not: BookingStatus.HOLD },
      },
      include: {
        professional: {
          include: { services: true },
        },
        items: {
          include: { service: true },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
    });
    if (!booking || booking.endAt > new Date()) {
      throw this.notFound();
    }
    const item = booking.items[0];
    if (!item) throw this.notFound();
    const serviceUsable =
      item.service.isActive && item.service.isOnlineBookable;
    const professionalUsable =
      serviceUsable &&
      booking.professional.isActive &&
      booking.professional.isOnlineBookable &&
      booking.professional.services.some(
        (relation) => relation.serviceId === item.serviceId,
      );
    return {
      publicCode: booking.publicCode,
      service: serviceUsable
        ? { id: item.service.id, name: item.service.name }
        : null,
      previousServiceName: item.serviceName,
      professional: professionalUsable
        ? {
            id: booking.professional.id,
            name: booking.professional.name,
          }
        : null,
      targetStep: serviceUsable ? 3 : 1,
      message: serviceUsable
        ? 'Son randevun hazır.'
        : 'Bu hizmet artık online seçilemiyor. Güncel hizmetlerden birini seçebilirsin.',
    };
  }

  async availability(
    customerId: string,
    publicCode: string,
    query: GetBookingChangeAvailabilityDto,
  ) {
    const booking = await this.requireOwned(customerId, publicCode);
    return this.changes.customerAvailability(booking.id, query);
  }

  async createChangeRequest(
    customerId: string,
    publicCode: string,
    dto: CreateBookingChangeRequestDto,
  ) {
    const booking = await this.requireOwned(customerId, publicCode);
    return this.changes.createForCustomer(booking.id, dto);
  }

  async cancel(
    customerId: string,
    publicCode: string,
    dto: CustomerCancelBookingDto,
  ) {
    const booking = await this.requireOwned(customerId, publicCode);
    return this.changes.cancelForCustomer(booking.id, dto);
  }

  async calendar(customerId: string, publicCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        customerId,
        publicCode: publicCode.trim().toUpperCase(),
        status: BookingStatus.CONFIRMED,
      },
      include: {
        branch: true,
        professional: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!booking) throw this.notFound();
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
      'PRODID:-//Ramazan Inanc Hair Art Studio//Customer Account//TR',
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

  private async requireOwned(customerId: string, publicCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        customerId,
        publicCode: publicCode.trim().toUpperCase(),
      },
      select: { id: true },
    });
    if (!booking) throw this.notFound();
    return booking;
  }

  private toSummary(booking: BookingSummaryRecord) {
    return {
      id: booking.id,
      publicCode: booking.publicCode,
      status: booking.status,
      visitStatus: booking.visitStatus,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      totalDurationMinutes: booking.totalDurationMinutes,
      totalPriceKurus: booking.totalPriceKurus,
      revision: booking.revision,
      notificationsEnabled: booking.notificationsEnabled,
      seriesId: booking.seriesId,
      occurrenceIndex: booking.occurrenceIndex,
      isSeriesException: booking.isSeriesException,
      professional: {
        id: booking.professional.id,
        name: booking.professional.name,
        title: booking.professional.title,
      },
      branch: {
        name: booking.branch.name,
        city: booking.branch.city,
        district: booking.branch.district,
      },
      items: booking.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        durationMinutes: item.durationMinutes,
        priceKurus: item.priceKurus,
        preVisitInstructions: item.preVisitInstructionsSnapshot,
        postVisitInstructions: item.postVisitInstructionsSnapshot,
      })),
      activeChangeRequest: booking.changeRequests[0]
        ? {
            id: booking.changeRequests[0].id,
            status: booking.changeRequests[0].status,
            requestedStartAt:
              booking.changeRequests[0].requestedStartAt.toISOString(),
            requestedProfessionalName:
              booking.changeRequests[0].requestedProfessional.name,
          }
        : null,
    };
  }

  private toDetail(booking: BookingDetailRecord) {
    const reviewDelayMinutes =
      booking.branch.bookingPolicy?.reviewRequestDelayMinutes ?? 30;
    const reviewAvailableAt = new Date(
      booking.endAt.getTime() + reviewDelayMinutes * 60_000,
    );
    return {
      ...this.toSummary(booking),
      customerNote: booking.customerNote,
      rejectionReason: booking.rejectionReason,
      cancellationReason: booking.cancellationReason,
      reviewAvailableAt: reviewAvailableAt.toISOString(),
      reviewEligible:
        booking.status === BookingStatus.CONFIRMED &&
        booking.visitStatus !== 'NO_SHOW' &&
        booking.branch.bookingPolicy?.reviewRequestEnabled !== false,
      reviewSubmitted: booking.review?.submittedAt != null,
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
      notifications: booking.notifications.map((notification) => ({
        id: notification.id,
        eventType: notification.eventType,
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
      canCancel:
        (booking.status === BookingStatus.PENDING_APPROVAL ||
          booking.status === BookingStatus.CONFIRMED) &&
        booking.startAt > new Date(),
      canRequestChange:
        (booking.status === BookingStatus.PENDING_APPROVAL ||
          booking.status === BookingStatus.CONFIRMED) &&
        booking.startAt > new Date(),
    };
  }

  private notFound() {
    return new NotFoundException('Randevu bulunamadı.');
  }
}
