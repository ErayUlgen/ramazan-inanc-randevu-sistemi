import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingStatus,
  Prisma,
  VisitStatus,
} from '@prisma/client';
import { tryNormalizeTurkishMobile } from '../common/phone';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchCustomersDto } from './dto/search-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateOnlineBookingAccessDto } from './dto/update-online-booking-access.dto';

const BOOKING_INCLUDE = {
  professional: { select: { id: true, name: true, title: true } },
  items: {
    select: {
      id: true,
      serviceId: true,
      serviceName: true,
      durationMinutes: true,
      priceKurus: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.BookingInclude;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async search(branchId: string, dto: SearchCustomersDto) {
    const query = dto.query.trim();
    const normalizedPhone = tryNormalizeTurkishMobile(query);
    const phoneDigits = query.replace(/\D/g, '');
    const customers = await this.prisma.customer.findMany({
      where: {
        mergedIntoId: null,
        bookings: { some: { branchId } },
        ...(normalizedPhone
          ? {
              OR: [
                { phone: normalizedPhone },
                { fullName: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {
              OR: [
                { fullName: { contains: query, mode: 'insensitive' } },
                ...(phoneDigits.length >= 2
                  ? [{ phone: { contains: phoneDigits } }]
                  : []),
              ],
            }),
      },
      orderBy: normalizedPhone
        ? [{ phone: 'asc' }, { fullName: 'asc' }]
        : [{ fullName: 'asc' }],
      take: dto.take + 1,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
      include: {
        bookings: {
          where: {
            branchId,
            status: {
              in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL],
            },
          },
          orderBy: { startAt: 'desc' },
          take: 3,
          select: {
            id: true,
            status: true,
            visitStatus: true,
            startAt: true,
            professional: { select: { name: true } },
            items: {
              select: { serviceName: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    const hasMore = customers.length > dto.take;
    const page = customers.slice(0, dto.take);
    return {
      items: page.map((customer) => ({
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        internalNote: customer.internalNote,
        recentBookings: customer.bookings.map((booking) => ({
          ...booking,
          startAt: booking.startAt.toISOString(),
        })),
      })),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async detail(branchId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, mergedIntoId: null, bookings: { some: { branchId } } },
      include: {
        bookings: {
          where: { branchId, status: { not: BookingStatus.HOLD } },
          include: BOOKING_INCLUDE,
          orderBy: { startAt: 'desc' },
          take: 100,
        },
      },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    const now = new Date();
    const future = customer.bookings.filter(
      (booking) =>
        booking.endAt > now &&
        (booking.status === BookingStatus.CONFIRMED ||
          booking.status === BookingStatus.PENDING_APPROVAL),
    );
    const past = customer.bookings.filter(
      (booking) =>
        booking.endAt <= now ||
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.REJECTED ||
        booking.status === BookingStatus.EXPIRED,
    );
    const pastConfirmed = customer.bookings.filter(
      (booking) =>
        booking.status === BookingStatus.CONFIRMED &&
        booking.endAt <= now &&
        booking.visitStatus !== VisitStatus.NO_SHOW,
    );
    const noShow = customer.bookings.filter(
      (booking) => booking.visitStatus === VisitStatus.NO_SHOW,
    );
    const lastPastVisit = pastConfirmed[0] ?? past[0] ?? null;
    return {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      internalNote: customer.internalNote,
      onlineBookingBlockedAt:
        customer.onlineBookingBlockedAt?.toISOString() ?? null,
      onlineBookingBlockReason: customer.onlineBookingBlockReason,
      createdAt: customer.createdAt.toISOString(),
      summary: {
        totalBookings: customer.bookings.length,
        pastVisitTotal: pastConfirmed.length,
        noShowTotal: noShow.length,
        cancelledTotal: customer.bookings.filter(
          (booking) => booking.status === BookingStatus.CANCELLED,
        ).length,
        lastProfessionalName: lastPastVisit?.professional.name ?? null,
        lastServiceNames:
          lastPastVisit?.items.map((item) => item.serviceName) ?? [],
      },
      futureBookings: future.map(this.bookingDto),
      pastBookings: past.map(this.bookingDto),
    };
  }

  async update(branchId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, bookings: { some: { branchId } } },
    });
    if (!existing) throw new NotFoundException('Müşteri bulunamadı.');
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.customer.update({
        where: { id },
        data: {
          ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.internalNote !== undefined
            ? { internalNote: dto.internalNote.trim() || null }
            : {}),
        },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CUSTOMER',
        entityId: id,
        action: 'CUSTOMER_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: {
          fullName: existing.fullName,
          hasInternalNote: Boolean(existing.internalNote),
        },
        afterData: {
          fullName: updated.fullName,
          hasInternalNote: Boolean(updated.internalNote),
        },
      });
      return {
        id: updated.id,
        fullName: updated.fullName,
        phone: updated.phone,
        email: updated.email,
        internalNote: updated.internalNote,
      };
    });
  }

  async updateOnlineBookingAccess(
    branchId: string,
    adminUserId: string,
    id: string,
    dto: UpdateOnlineBookingAccessDto,
  ) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, bookings: { some: { branchId } } },
    });
    if (!existing) throw new NotFoundException('Müşteri bulunamadı.');
    const reason = dto.reason?.trim() ?? '';
    if (dto.blocked && reason.length < 3) {
      throw new BadRequestException(
        'Online rezervasyonu kapatmak için neden yazın.',
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.customer.update({
        where: { id },
        data: dto.blocked
          ? {
              onlineBookingBlockedAt: new Date(),
              onlineBookingBlockReason: reason,
              onlineBookingBlockedByAdminUserId: adminUserId,
            }
          : {
              onlineBookingBlockedAt: null,
              onlineBookingBlockReason: null,
              onlineBookingBlockedByAdminUserId: null,
            },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CUSTOMER',
        entityId: id,
        action: dto.blocked
          ? 'ONLINE_BOOKING_BLOCKED'
          : 'ONLINE_BOOKING_UNBLOCKED',
        actorType: AuditActorType.ADMIN,
        beforeData: { blocked: Boolean(existing.onlineBookingBlockedAt) },
        afterData: { blocked: Boolean(updated.onlineBookingBlockedAt) },
        reason: dto.blocked ? reason : undefined,
      });
      return {
        id: updated.id,
        onlineBookingBlockedAt:
          updated.onlineBookingBlockedAt?.toISOString() ?? null,
        onlineBookingBlockReason: updated.onlineBookingBlockReason,
      };
    });
  }

  private bookingDto(
    this: void,
    booking: Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>,
  ) {
    return {
      id: booking.id,
      publicCode: booking.publicCode,
      status: booking.status,
      source: booking.source,
      visitStatus: booking.visitStatus,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      totalPriceKurus: booking.totalPriceKurus,
      totalDurationMinutes: booking.totalDurationMinutes,
      professional: booking.professional,
      items: booking.items,
    };
  }
}
