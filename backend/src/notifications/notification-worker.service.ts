import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  BookingStatus,
  NotificationEventType,
  NotificationStatus,
  Prisma,
  VisitStatus,
} from '@prisma/client';
import { maskPhone } from '../common/phone';
import { openActionToken } from '../common/action-token';
import { PrismaService } from '../prisma/prisma.service';
import { renderBookingSms, renderWaitlistSms } from './notification-templates';
import { SmsGatewayService } from './sms-gateway.service';

const BATCH_SIZE = 10;
const STALE_PROCESSING_MS = 5 * 60_000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000];

@Injectable()
export class NotificationWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationWorkerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsGatewayService,
  ) {}

  onModuleInit(): void {
    if (process.env.DISABLE_NOTIFICATION_WORKERS === 'true') return;
    this.timer = setInterval(() => void this.processDue(), 10_000);
    this.timer.unref();
    void this.processDue();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processDue(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      await this.recoverStaleClaims();
      const ids = await this.claimBatch();
      for (const id of ids) await this.processOne(id);
      return ids.length;
    } finally {
      this.running = false;
    }
  }

  private async claimBatch(): Promise<string[]> {
    return this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<
        Array<{ id: string }>
      >(Prisma.sql`
        SELECT "id"
        FROM "booking_notifications"
        WHERE "status" IN ('PENDING', 'RETRY_SCHEDULED')
          AND "available_at" <= NOW()
        ORDER BY "available_at" ASC, "created_at" ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `);
      if (!rows.length) return [];
      const ids = rows.map((row) => row.id);
      await transaction.bookingNotification.updateMany({
        where: {
          id: { in: ids },
          status: {
            in: [
              NotificationStatus.PENDING,
              NotificationStatus.RETRY_SCHEDULED,
            ],
          },
        },
        data: {
          status: NotificationStatus.PROCESSING,
          processingStartedAt: new Date(),
        },
      });
      return ids;
    });
  }

  private async processOne(id: string): Promise<void> {
    const notification = await this.prisma.bookingNotification.findUnique({
      where: { id },
      include: {
        booking: {
          include: { customer: true, professional: true, review: true },
        },
        waitlistEntry: true,
        waitlistOffer: {
          include: { professional: true },
        },
      },
    });
    if (!notification || notification.status !== NotificationStatus.PROCESSING)
      return;
    const { booking } = notification;
    const recipient = booking
      ? (booking.customerPhoneSnapshot ?? booking.customer?.phone)
      : notification.recipientPhone;
    if ((booking && booking.notificationsEnabled === false) || !recipient) {
      await this.skip(
        id,
        'NOTIFICATIONS_DISABLED',
        'Randevu için bildirim kapalı veya telefon bulunmuyor.',
      );
      return;
    }
    if (
      booking &&
      notification.bookingRevision != null &&
      notification.bookingRevision !== booking.revision
    ) {
      await this.skip(
        id,
        'STALE_BOOKING_REVISION',
        'Bildirim randevunun eski bir sürümüne ait.',
      );
      return;
    }
    if (
      notification.eventType === NotificationEventType.BOOKING_REMINDER &&
      (!booking ||
        booking.status !== BookingStatus.CONFIRMED ||
        booking.startAt <= new Date() ||
        (notification.appointmentStartAt != null &&
          notification.appointmentStartAt.getTime() !==
            booking.startAt.getTime()))
    ) {
      await this.skip(
        id,
        'BOOKING_NOT_CONFIRMABLE',
        'Randevu artık hatırlatma için uygun değil.',
      );
      return;
    }
    if (
      notification.eventType === NotificationEventType.REVIEW_REQUESTED &&
      (!booking ||
        booking.status !== BookingStatus.CONFIRMED ||
        booking.visitStatus === VisitStatus.NO_SHOW ||
        !booking.review ||
        booking.review.submittedAt != null ||
        booking.review.requestExpiresAt <= new Date() ||
        !booking.review.requestTokenHash)
    ) {
      await this.skip(
        id,
        'REVIEW_NOT_AVAILABLE',
        'Randevu artık değerlendirme isteği için uygun değil.',
      );
      return;
    }
    if (
      notification.waitlistOffer &&
      notification.eventType === NotificationEventType.WAITLIST_OFFERED &&
      (notification.waitlistOffer.status !== 'PENDING' ||
        notification.waitlistOffer.expiresAt <= new Date())
    ) {
      await this.skip(
        id,
        'STALE_WAITLIST_OFFER',
        'Bekleme listesi teklifi artık geçerli değil.',
      );
      return;
    }

    const attempt = notification.attemptCount + 1;
    const startedAt = Date.now();
    try {
      const bookingPayload = (notification.payload ?? undefined) as
        | {
            newStartAt?: string;
            newProfessionalName?: string;
            requestedStartAt?: string;
            requestedProfessionalName?: string;
            actionTokenEnvelope?: string;
            messageTemplate?: string;
          }
        | undefined;
      const renderedMessage = booking
        ? bookingPayload?.messageTemplate
          ? renderConfiguredTemplate(bookingPayload.messageTemplate, booking)
          : renderBookingSms(notification.eventType, booking, {
              ...bookingPayload,
              actionToken:
                openActionToken(bookingPayload?.actionTokenEnvelope) ??
                undefined,
            })
        : renderWaitlistSms(notification.eventType, {
            ...((notification.payload ?? {}) as {
              startAt?: string;
              professionalName?: string;
              expiresAt?: string;
              reference?: string;
              actionTokenEnvelope?: string;
            }),
            actionToken:
              openActionToken(
                (
                  notification.payload as {
                    actionTokenEnvelope?: string;
                  } | null
                )?.actionTokenEnvelope,
              ) ?? undefined,
          });
      const result = await this.sms.send({
        to: recipient,
        message: renderedMessage,
        idempotencyKey: notification.idempotencyKey,
      });
      if (result.accepted) {
        const sentAt = new Date();
        await this.prisma.bookingNotification.update({
          where: { id },
          data: {
            status: NotificationStatus.SENT,
            attemptCount: attempt,
            lastAttemptAt: sentAt,
            processingStartedAt: null,
            sentAt,
            provider: result.provider,
            providerMessageId: result.providerMessageId,
            providerResponseCode: result.responseCode,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });
        if (
          booking &&
          notification.eventType === NotificationEventType.REVIEW_REQUESTED
        ) {
          await this.prisma.bookingReview.updateMany({
            where: { bookingId: booking.id, requestSentAt: null },
            data: { requestSentAt: sentAt },
          });
        }
      } else {
        await this.failOrRetry(id, attempt, notification.maxAttempts, result);
      }
      this.logger.log(
        JSON.stringify({
          event: 'notification_attempt',
          notificationId: id,
          bookingId: booking?.id ?? null,
          waitlistEntryId: notification.waitlistEntryId,
          recipient: maskPhone(recipient),
          provider: result.provider,
          attempt,
          accepted: result.accepted,
          durationMs: Date.now() - startedAt,
        }),
      );
    } catch {
      await this.failOrRetry(id, attempt, notification.maxAttempts, {
        provider: 'unknown',
        retryable: true,
        errorCode: 'UNEXPECTED_PROVIDER_ERROR',
        errorMessage: 'SMS sağlayıcısı beklenmeyen bir hata verdi.',
      });
    }
  }

  private async failOrRetry(
    id: string,
    attempt: number,
    maxAttempts: number,
    result: {
      provider: string;
      retryable?: boolean;
      responseCode?: string;
      errorCode?: string;
      errorMessage?: string;
    },
  ) {
    const retry = Boolean(result.retryable) && attempt < maxAttempts;
    const delay =
      RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
    await this.prisma.bookingNotification.update({
      where: { id },
      data: {
        status: retry
          ? NotificationStatus.RETRY_SCHEDULED
          : NotificationStatus.FAILED,
        attemptCount: attempt,
        lastAttemptAt: new Date(),
        processingStartedAt: null,
        availableAt: retry ? new Date(Date.now() + delay) : new Date(),
        failedAt: retry ? null : new Date(),
        provider: result.provider,
        providerResponseCode: result.responseCode,
        lastErrorCode: result.errorCode,
        lastErrorMessage: result.errorMessage?.slice(0, 300),
      },
    });
  }

  private skip(id: string, code: string, message: string) {
    return this.prisma.bookingNotification.update({
      where: { id },
      data: {
        status: NotificationStatus.SKIPPED,
        processingStartedAt: null,
        lastErrorCode: code,
        lastErrorMessage: message,
      },
    });
  }

  private recoverStaleClaims() {
    return this.prisma.bookingNotification.updateMany({
      where: {
        status: NotificationStatus.PROCESSING,
        processingStartedAt: {
          lte: new Date(Date.now() - STALE_PROCESSING_MS),
        },
      },
      data: {
        status: NotificationStatus.RETRY_SCHEDULED,
        availableAt: new Date(),
        processingStartedAt: null,
        lastErrorCode: 'STALE_WORKER_CLAIM',
        lastErrorMessage: 'İşlem yarıda kaldığı için yeniden kuyruğa alındı.',
      },
    });
  }
}

function renderConfiguredTemplate(
  template: string,
  booking: {
    publicCode: string;
    startAt: Date;
    professional: { name: string };
  },
) {
  const date = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  }).format(booking.startAt);
  const time = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Istanbul',
  }).format(booking.startAt);
  return template
    .replaceAll('{{tarih}}', date)
    .replaceAll('{{saat}}', time)
    .replaceAll('{{uzman}}', booking.professional.name)
    .replaceAll('{{referans}}', booking.publicCode)
    .slice(0, 480);
}
