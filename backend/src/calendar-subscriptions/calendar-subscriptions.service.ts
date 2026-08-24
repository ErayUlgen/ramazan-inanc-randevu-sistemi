import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingStatus,
  CalendarSubscriptionScope,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import type { AdminIdentity } from '../admin/admin-session.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarSubscriptionDto } from './dto/calendar-subscription.dto';

@Injectable()
export class CalendarSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  list(branchId: string) {
    return this.prisma.calendarSubscription.findMany({
      where: { branchId },
      include: {
        professional: { select: { id: true, name: true } },
        createdByAdminUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    branchId: string,
    dto: CreateCalendarSubscriptionDto,
    identity: AdminIdentity,
  ) {
    await this.validateScope(branchId, dto.scope, dto.professionalId);
    const token = randomBytes(32).toString('base64url');
    const subscription = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.calendarSubscription.create({
        data: {
          branchId,
          label: dto.label.trim(),
          scope: dto.scope,
          professionalId:
            dto.scope === CalendarSubscriptionScope.PROFESSIONAL
              ? dto.professionalId
              : null,
          tokenHash: this.hash(token),
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          createdByAdminUserId: identity.userId,
        },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CALENDAR_SUBSCRIPTION',
        entityId: created.id,
        action: 'CALENDAR_SUBSCRIPTION_CREATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: {
          scope: created.scope,
          professionalId: created.professionalId,
          expiresAt: created.expiresAt?.toISOString() ?? null,
        },
      });
      return created;
    });
    return { ...subscription, url: this.url(token) };
  }

  async rotate(branchId: string, id: string, identity: AdminIdentity) {
    await this.requireSubscription(branchId, id);
    const token = randomBytes(32).toString('base64url');
    const updated = await this.prisma.$transaction(async (transaction) => {
      const subscription = await transaction.calendarSubscription.update({
        where: { id },
        data: { tokenHash: this.hash(token), revokedAt: null },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CALENDAR_SUBSCRIPTION',
        entityId: id,
        action: 'CALENDAR_SUBSCRIPTION_ROTATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
      });
      return subscription;
    });
    return { ...updated, url: this.url(token) };
  }

  async revoke(branchId: string, id: string, identity: AdminIdentity) {
    await this.requireSubscription(branchId, id);
    return this.prisma.$transaction(async (transaction) => {
      const subscription = await transaction.calendarSubscription.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CALENDAR_SUBSCRIPTION',
        entityId: id,
        action: 'CALENDAR_SUBSCRIPTION_REVOKED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
      });
      return subscription;
    });
  }

  async calendar(token: string) {
    const subscription = await this.prisma.calendarSubscription.findUnique({
      where: { tokenHash: this.hash(token) },
      include: {
        branch: true,
        professional: { select: { id: true, name: true } },
      },
    });
    if (!subscription)
      throw new NotFoundException('Takvim aboneliği bulunamadı.');
    if (
      subscription.revokedAt ||
      (subscription.expiresAt && subscription.expiresAt <= new Date())
    ) {
      throw new GoneException('Takvim aboneliği artık geçerli değil.');
    }
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 3);
    const to = new Date();
    to.setUTCFullYear(to.getUTCFullYear() + 2);
    const bookings = await this.prisma.booking.findMany({
      where: {
        branchId: subscription.branchId,
        ...(subscription.scope === CalendarSubscriptionScope.PROFESSIONAL
          ? { professionalId: subscription.professionalId! }
          : {}),
        startAt: { gte: from, lte: to },
        status: {
          in: [
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.CONFIRMED,
            BookingStatus.CANCELLED,
            BookingStatus.REJECTED,
          ],
        },
      },
      include: {
        professional: { select: { name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { startAt: 'asc' },
    });
    await this.prisma.calendarSubscription.update({
      where: { id: subscription.id },
      data: { lastUsedAt: new Date() },
    });
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ramazan Inanc Hair Art Studio//Randevu Takvimi//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcs(subscription.label)}`,
      `X-WR-TIMEZONE:${escapeIcs(subscription.branch.timezone)}`,
      ...bookings.flatMap((booking) => [
        'BEGIN:VEVENT',
        `UID:booking-${booking.id}@ramazaninanc.com`,
        `DTSTAMP:${utc(booking.updatedAt)}`,
        `LAST-MODIFIED:${utc(booking.updatedAt)}`,
        `DTSTART:${utc(booking.startAt)}`,
        `DTEND:${utc(booking.endAt)}`,
        `SUMMARY:${escapeIcs(`${booking.items.map((item) => item.serviceName).join(' + ')} · ${booking.professional.name}`)}`,
        `DESCRIPTION:${escapeIcs(`Referans: ${booking.publicCode}`)}`,
        `STATUS:${icsStatus(booking.status)}`,
        'END:VEVENT',
      ]),
      'END:VCALENDAR',
    ];
    return `${lines.map(foldLine).join('\r\n')}\r\n`;
  }

  private async validateScope(
    branchId: string,
    scope: CalendarSubscriptionScope,
    professionalId?: string,
  ) {
    if (scope === CalendarSubscriptionScope.PROFESSIONAL) {
      if (!professionalId) {
        throw new BadRequestException(
          'Uzman aboneliğinde uzman seçimi zorunludur.',
        );
      }
      const exists = await this.prisma.professional.count({
        where: { id: professionalId, branchId, isActive: true },
      });
      if (!exists) throw new BadRequestException('Uzman bu salona ait değil.');
    }
  }

  private async requireSubscription(branchId: string, id: string) {
    const subscription = await this.prisma.calendarSubscription.findFirst({
      where: { id, branchId },
    });
    if (!subscription)
      throw new NotFoundException('Takvim aboneliği bulunamadı.');
    return subscription;
  }

  private url(token: string) {
    const base = (
      process.env.PUBLIC_API_URL ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${base}/calendar/subscriptions/${token}.ics`;
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}

function utc(value: Date) {
  return value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function foldLine(value: string) {
  if (Buffer.byteLength(value, 'utf8') <= 75) return value;
  const chunks: string[] = [];
  let current = '';
  for (const character of value) {
    if (Buffer.byteLength(`${current}${character}`, 'utf8') > 73) {
      chunks.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

function icsStatus(status: BookingStatus) {
  if (status === BookingStatus.CANCELLED || status === BookingStatus.REJECTED) {
    return 'CANCELLED';
  }
  if (status === BookingStatus.CONFIRMED) return 'CONFIRMED';
  return 'TENTATIVE';
}
