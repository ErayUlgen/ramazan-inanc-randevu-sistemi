import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  BookingStatus,
  NotificationChannel,
  NotificationEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    if (process.env.DISABLE_NOTIFICATION_WORKERS === 'true') return;
    this.timer = setInterval(() => void this.scheduleDueReminders(), 60_000);
    this.timer.unref();
    void this.scheduleDueReminders();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async scheduleDueReminders(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      if (!this.prisma.notificationRule) {
        return this.scheduleLegacyReminders(now);
      }
      const rules = await this.prisma.notificationRule.findMany({
        where: {
          eventType: NotificationEventType.BOOKING_REMINDER,
          channel: NotificationChannel.SMS,
          isActive: true,
          leadMinutes: { not: null },
        },
        orderBy: { leadMinutes: 'desc' },
      });
      if (!rules.length) return 0;
      const maximumLead = Math.max(
        ...rules.map((rule) => rule.leadMinutes ?? 0),
      );
      const candidates = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          notificationsEnabled: true,
          OR: [
            { customerPhoneSnapshot: { not: null } },
            { customerId: { not: null } },
          ],
          startAt: {
            gt: now,
            lte: new Date(now.getTime() + maximumLead * 60_000 + 60_000),
          },
        },
        orderBy: { startAt: 'asc' },
        take: 500,
      });
      const byBranch = new Map(rules.map((rule) => [rule.id, rule]));
      const due = candidates.flatMap((booking) =>
        [...byBranch.values()]
          .filter((rule) => {
            if (rule.branchId !== booking.branchId) return false;
            const statuses = Array.isArray(rule.bookingStatuses)
              ? (rule.bookingStatuses as string[])
              : [BookingStatus.CONFIRMED];
            return (
              statuses.includes(booking.status) &&
              booking.startAt.getTime() - (rule.leadMinutes ?? 0) * 60_000 <=
                now.getTime()
            );
          })
          .map((rule) => ({ booking, rule })),
      );
      if (!due.length) return 0;
      const result = await this.prisma.bookingNotification.createMany({
        data: due.map(({ booking, rule }) => ({
          bookingId: booking.id,
          channel: NotificationChannel.SMS,
          eventType: NotificationEventType.BOOKING_REMINDER,
          scheduledFor: new Date(
            booking.startAt.getTime() - (rule.leadMinutes ?? 0) * 60_000,
          ),
          availableAt: now,
          idempotencyKey: `booking:${booking.id}:reminder:${rule.id}:${booking.startAt.toISOString()}:r${booking.revision}`,
          bookingRevision: booking.revision,
          appointmentStartAt: booking.startAt,
          notificationRuleId: rule.id,
          payload: {
            startAt: booking.startAt.toISOString(),
            messageTemplate: rule.messageTemplate,
          },
        })),
        skipDuplicates: true,
      });
      return result.count;
    } finally {
      this.running = false;
    }
  }

  private async scheduleLegacyReminders(now: Date): Promise<number> {
    const candidates = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        notificationsEnabled: true,
        OR: [
          { customerPhoneSnapshot: { not: null } },
          { customerId: { not: null } },
        ],
        startAt: { gt: now },
      },
      include: { branch: { select: { reminderLeadMinutes: true } } },
      orderBy: { startAt: 'asc' },
      take: 500,
    });
    const due = candidates.filter(
      (booking) =>
        booking.startAt.getTime() -
          booking.branch.reminderLeadMinutes * 60_000 <=
        now.getTime(),
    );
    if (!due.length) return 0;
    const result = await this.prisma.bookingNotification.createMany({
      data: due.map((booking) => ({
        bookingId: booking.id,
        channel: NotificationChannel.SMS,
        eventType: NotificationEventType.BOOKING_REMINDER,
        scheduledFor: new Date(
          booking.startAt.getTime() -
            booking.branch.reminderLeadMinutes * 60_000,
        ),
        availableAt: now,
        idempotencyKey: `booking:${booking.id}:reminder:${booking.startAt.toISOString()}:v1`,
        bookingRevision: booking.revision ?? 1,
        appointmentStartAt: booking.startAt,
        payload: { startAt: booking.startAt.toISOString() },
      })),
      skipDuplicates: true,
    });
    return result.count;
  }
}
