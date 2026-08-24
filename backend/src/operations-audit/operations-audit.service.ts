import { Injectable } from '@nestjs/common';
import { AuditActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { branchDayBounds } from '../common/branch-time';
import type { AdminIdentity } from '../admin/admin-session.service';
import { AuditQueryDto, ExportQueryDto } from './dto/audit-query.dto';

export type AuditWrite = {
  branchId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: AuditActorType;
  bookingId?: string;
  adminUserId?: string;
  actorLabel?: string;
  requestIpHash?: string;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
  reason?: string;
};

@Injectable()
export class OperationsAuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(transaction: Prisma.TransactionClient, event: AuditWrite) {
    return transaction.operationalAuditEvent.create({
      data: {
        branchId: event.branchId,
        bookingId: event.bookingId,
        adminUserId: event.adminUserId,
        actorLabel: event.actorLabel,
        requestIpHash: event.requestIpHash,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        actorType: event.actorType,
        beforeData: event.beforeData,
        afterData: event.afterData,
        reason: event.reason?.trim() || null,
      },
    });
  }

  async listForBooking(bookingId: string) {
    const events = await this.prisma.operationalAuditEvent.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return events.map((event) => ({
      id: event.id,
      entityType: event.entityType,
      action: event.action,
      actorType: event.actorType,
      beforeData: event.beforeData,
      afterData: event.afterData,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async list(branchId: string, query: AuditQueryDto) {
    const range = this.range(query.from, query.to);
    const events = await this.prisma.operationalAuditEvent.findMany({
      where: {
        branchId,
        createdAt: { gte: range.start, lt: range.end },
        ...(query.adminUserId ? { adminUserId: query.adminUserId } : {}),
        ...(query.action
          ? { action: { contains: query.action, mode: 'insensitive' } }
          : {}),
        ...(query.entityType
          ? { entityType: query.entityType.toUpperCase() }
          : {}),
        ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      },
      include: {
        adminUser: { select: { id: true, displayName: true, role: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 101,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = events.length > 100;
    const page = events.slice(0, 100);
    return {
      items: page.map((event) => ({
        ...event,
        requestIpHash: event.requestIpHash
          ? `${event.requestIpHash.slice(0, 10)}…`
          : null,
        createdAt: event.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async streamExport(
    branchId: string,
    query: ExportQueryDto,
    response: Response,
  ) {
    const range = this.range(query.from, query.to, 366);
    if (query.type === 'bookings') {
      response.write(
        csvRow([
          'Referans',
          'Başlangıç',
          'Durum',
          'Ziyaret',
          'Kaynak',
          'Müşteri',
          'Uzman',
          'Hizmet',
          'Tutar (kr)',
        ]),
      );
      let cursor: string | undefined;
      do {
        const rows = await this.prisma.booking.findMany({
          where: {
            branchId,
            startAt: { gte: range.start, lt: range.end },
          },
          include: {
            professional: { select: { name: true } },
            items: { select: { serviceName: true } },
          },
          orderBy: { id: 'asc' },
          take: 500,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        for (const row of rows) {
          response.write(
            csvRow([
              row.publicCode,
              row.startAt.toISOString(),
              row.status,
              row.visitStatus,
              row.source,
              row.customerNameSnapshot ?? '',
              row.professional.name,
              row.items.map((item) => item.serviceName).join(' + '),
              row.totalPriceKurus,
            ]),
          );
        }
        cursor = rows.length === 500 ? rows.at(-1)?.id : undefined;
      } while (cursor);
      return;
    }
    if (query.type === 'customers') {
      response.write(
        csvRow([
          'Müşteri',
          'Telefon',
          'E-posta',
          'SMS açık',
          'Son randevu',
          'Randevu sayısı',
        ]),
      );
      const rows = await this.prisma.customer.findMany({
        where: {
          mergedIntoId: null,
          bookings: {
            some: {
              branchId,
              startAt: { gte: range.start, lt: range.end },
            },
          },
        },
        select: {
          fullName: true,
          phone: true,
          email: true,
          smsNotificationsEnabled: true,
          bookings: {
            where: { branchId },
            select: { startAt: true },
            orderBy: { startAt: 'desc' },
          },
        },
        take: 10_000,
      });
      for (const row of rows) {
        response.write(
          csvRow([
            row.fullName,
            row.phone,
            row.email ?? '',
            row.smsNotificationsEnabled ? 'Evet' : 'Hayır',
            row.bookings[0]?.startAt.toISOString() ?? '',
            row.bookings.length,
          ]),
        );
      }
      return;
    }
    if (query.type === 'notifications') {
      response.write(
        csvRow([
          'Olay',
          'Durum',
          'Planlanan',
          'Deneme',
          'Hata kodu',
          'Hata özeti',
        ]),
      );
      const rows = await this.prisma.bookingNotification.findMany({
        where: {
          createdAt: { gte: range.start, lt: range.end },
          OR: [{ booking: { branchId } }, { waitlistEntry: { branchId } }],
        },
        orderBy: { createdAt: 'asc' },
        take: 10_000,
      });
      for (const row of rows) {
        response.write(
          csvRow([
            row.eventType,
            row.status,
            row.scheduledFor.toISOString(),
            row.attemptCount,
            row.lastErrorCode ?? '',
            row.lastErrorMessage ?? '',
          ]),
        );
      }
      return;
    }
    const bookings = await this.prisma.booking.findMany({
      where: {
        branchId,
        startAt: { gte: range.start, lt: range.end },
      },
      include: {
        professional: { select: { id: true, name: true } },
        items: { select: { serviceId: true, serviceName: true } },
      },
      take: 10_000,
    });
    const now = new Date();
    const byKey = new Map<
      string,
      {
        name: string;
        appointments: number;
        pastVisits: number;
        estimatedValue: number;
      }
    >();
    for (const booking of bookings) {
      const entries =
        query.type === 'professionals'
          ? [[booking.professional.id, booking.professional.name] as const]
          : booking.items.map(
              (item) => [item.serviceId, item.serviceName] as const,
            );
      for (const [id, name] of entries) {
        const current = byKey.get(id) ?? {
          name,
          appointments: 0,
          pastVisits: 0,
          estimatedValue: 0,
        };
        current.appointments += 1;
        if (
          booking.status === 'CONFIRMED' &&
          booking.endAt <= now &&
          booking.visitStatus !== 'NO_SHOW'
        ) {
          current.pastVisits += 1;
          current.estimatedValue += booking.totalPriceKurus;
        }
        byKey.set(id, current);
      }
    }
    response.write(
      csvRow([
        'Ad',
        'Randevu',
        'Geçmiş onaylı randevu',
        'Tahmini hizmet değeri (kr)',
      ]),
    );
    for (const item of byKey.values()) {
      response.write(
        csvRow([
          item.name,
          item.appointments,
          item.pastVisits,
          item.estimatedValue,
        ]),
      );
    }
  }

  async recordExport(
    branchId: string,
    query: ExportQueryDto,
    identity: AdminIdentity,
  ) {
    await this.prisma.$transaction((transaction) =>
      this.write(transaction, {
        branchId,
        entityType: 'EXPORT',
        entityId: `${query.type}:${query.from}:${query.to}`,
        action: 'CSV_EXPORTED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: {
          type: query.type,
          from: query.from,
          to: query.to,
        },
      }),
    );
  }

  private range(from: string, to: string, maxDays = 90) {
    const start = branchDayBounds(from).start;
    const end = branchDayBounds(to).end;
    if (
      end <= start ||
      end.getTime() - start.getTime() > maxDays * 86_400_000
    ) {
      throw new BadRequestException(
        `Tarih aralığı en fazla ${maxDays} gün olabilir.`,
      );
    }
    return { start, end };
  }
}

export function csvCell(value: string | number | null | undefined) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvRow(values: Array<string | number | null | undefined>) {
  return `${values.map(csvCell).join(',')}\r\n`;
}
