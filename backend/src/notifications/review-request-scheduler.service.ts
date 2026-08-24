import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  BookingStatus,
  NotificationChannel,
  NotificationEventType,
  Prisma,
  VisitStatus,
} from '@prisma/client';
import {
  createActionToken,
  hashActionToken,
  sealActionToken,
} from '../common/action-token';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewRequestSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    if (process.env.DISABLE_NOTIFICATION_WORKERS === 'true') return;
    this.timer = setInterval(() => void this.scheduleDue(), 60_000);
    this.timer.unref();
    void this.scheduleDue();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async scheduleDue(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const candidates = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          visitStatus: { not: VisitStatus.NO_SHOW },
          notificationsEnabled: true,
          customerPhoneSnapshot: { not: null },
          endAt: { lte: now },
          branch: {
            bookingPolicy: { reviewRequestEnabled: true },
          },
          OR: [
            { review: { is: null } },
            {
              review: {
                is: { submittedAt: null, requestSentAt: null },
              },
            },
          ],
        },
        include: {
          branch: { include: { bookingPolicy: true } },
          review: true,
        },
        orderBy: { endAt: 'asc' },
        take: 300,
      });

      let scheduled = 0;
      for (const candidate of candidates) {
        const policy = candidate.branch.bookingPolicy;
        if (!policy) continue;
        const availableAt = new Date(
          candidate.endAt.getTime() + policy.reviewRequestDelayMinutes * 60_000,
        );
        if (availableAt > now) continue;

        const token = createActionToken();
        const idempotencyKey = `booking:${candidate.id}:review-request:auto:v2`;
        const expiresAt = new Date(
          availableAt.getTime() +
            policy.reviewRequestExpiryDays * 24 * 60 * 60_000,
        );

        const created = await this.prisma
          .$transaction(async (transaction) => {
            const booking = await transaction.booking.findUnique({
              where: { id: candidate.id },
              include: { review: true },
            });
            if (
              !booking ||
              booking.status !== BookingStatus.CONFIRMED ||
              booking.visitStatus === VisitStatus.NO_SHOW ||
              booking.review?.submittedAt ||
              booking.review?.requestSentAt
            ) {
              return false;
            }

            await transaction.bookingReview.upsert({
              where: { bookingId: booking.id },
              update: {
                customerId: booking.customerId,
                professionalId: booking.professionalId,
                requestTokenHash: hashActionToken(token),
                requestExpiresAt: expiresAt,
              },
              create: {
                bookingId: booking.id,
                customerId: booking.customerId,
                branchId: booking.branchId,
                professionalId: booking.professionalId,
                requestTokenHash: hashActionToken(token),
                requestExpiresAt: expiresAt,
              },
            });
            await transaction.bookingNotification.create({
              data: {
                bookingId: booking.id,
                channel: NotificationChannel.SMS,
                eventType: NotificationEventType.REVIEW_REQUESTED,
                scheduledFor: availableAt,
                availableAt,
                idempotencyKey,
                appointmentStartAt: booking.startAt,
                payload: {
                  actionTokenEnvelope: sealActionToken(token),
                },
              },
            });
            return true;
          })
          .catch((error: unknown) => {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              return false;
            }
            throw error;
          });
        if (created) scheduled += 1;
      }
      return scheduled;
    } finally {
      this.running = false;
    }
  }
}
