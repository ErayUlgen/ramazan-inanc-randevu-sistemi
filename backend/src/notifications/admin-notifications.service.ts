import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditActorType, NotificationStatus } from '@prisma/client';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminIdentity } from '../admin/admin-session.service';
import { ListNotificationsDto } from './dto/notification-rule.dto';

@Injectable()
export class AdminNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async list(bookingId: string) {
    const exists = await this.prisma.booking.count({
      where: { id: bookingId },
    });
    if (!exists) throw new NotFoundException('Randevu bulunamadı.');
    const notifications = await this.prisma.bookingNotification.findMany({
      where: { bookingId },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });
    return notifications.map((item) => this.toAdminDto(item));
  }

  async listAll(branchId: string, query: ListNotificationsDto) {
    const notifications = await this.prisma.bookingNotification.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.eventType ? { eventType: query.eventType } : {}),
        OR: [{ booking: { branchId } }, { waitlistEntry: { branchId } }],
      },
      include: {
        booking: {
          select: {
            id: true,
            publicCode: true,
            customerNameSnapshot: true,
            startAt: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 51,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = notifications.length > 50;
    const page = notifications.slice(0, 50);
    return {
      items: page.map((item) => ({
        ...this.toAdminDto(item),
        booking: item.booking
          ? {
              ...item.booking,
              startAt: item.booking.startAt.toISOString(),
            }
          : null,
      })),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async retry(id: string, identity?: AdminIdentity) {
    const notification = await this.prisma.bookingNotification.findUnique({
      where: { id },
      include: { booking: { select: { branchId: true } } },
    });
    if (!notification || !notification.booking || !notification.bookingId) {
      throw new NotFoundException('Randevu bildirimi bulunamadı.');
    }
    const branchId = notification.booking.branchId;
    const bookingId = notification.bookingId;
    if (
      notification.status !== NotificationStatus.FAILED ||
      notification.attemptCount >= notification.maxAttempts ||
      !this.isRetryableError(notification.lastErrorCode)
    ) {
      throw new BadRequestException(
        'Bu bildirim güvenli biçimde yeniden denenemez.',
      );
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.bookingNotification.update({
        where: { id },
        data: {
          status: NotificationStatus.PENDING,
          availableAt: new Date(),
          failedAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      await this.audit.write(transaction, {
        branchId,
        bookingId,
        entityType: 'BOOKING_NOTIFICATION',
        entityId: notification.id,
        action: 'NOTIFICATION_MANUALLY_RETRIED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity?.userId,
        actorLabel: identity?.displayName,
        beforeData: {
          status: notification.status,
          attemptCount: notification.attemptCount,
          lastErrorCode: notification.lastErrorCode,
        },
        afterData: { status: result.status },
      });
      return result;
    });
    return this.toAdminDto(updated);
  }

  private toAdminDto(item: {
    id: string;
    eventType: string;
    channel: string;
    status: string;
    scheduledFor: Date;
    availableAt: Date;
    attemptCount: number;
    maxAttempts: number;
    lastAttemptAt: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    provider: string | null;
    providerResponseCode: string | null;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
    createdAt: Date;
  }) {
    return {
      ...item,
      scheduledFor: item.scheduledFor.toISOString(),
      availableAt: item.availableAt.toISOString(),
      lastAttemptAt: item.lastAttemptAt?.toISOString() ?? null,
      sentAt: item.sentAt?.toISOString() ?? null,
      failedAt: item.failedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      canRetry:
        item.status === NotificationStatus.FAILED &&
        item.attemptCount < item.maxAttempts &&
        this.isRetryableError(item.lastErrorCode),
    };
  }

  private isRetryableError(code: string | null): boolean {
    return [
      'TEMPORARY_PROVIDER_FAILURE',
      'UNEXPECTED_PROVIDER_ERROR',
      'STALE_WORKER_CLAIM',
    ].includes(code ?? '');
  }
}
