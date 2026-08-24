import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationEventType,
  Prisma,
} from '@prisma/client';

type EnqueueMetadata = {
  bookingRevision?: number;
  appointmentStartAt?: Date;
  payload?: Prisma.InputJsonValue;
};

type WaitlistEnqueueMetadata = {
  waitlistOfferId?: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationOutboxService {
  enqueue(
    transaction: Prisma.TransactionClient,
    bookingId: string,
    eventType: NotificationEventType,
    scheduledFor = new Date(),
    idempotencyKey = `booking:${bookingId}:${eventType.toLowerCase()}:v1`,
    metadata: EnqueueMetadata = {},
  ) {
    const data = {
      bookingId,
      channel: NotificationChannel.SMS,
      eventType,
      scheduledFor,
      availableAt: scheduledFor,
      idempotencyKey,
      bookingRevision: metadata.bookingRevision,
      appointmentStartAt: metadata.appointmentStartAt,
      payload: metadata.payload,
    };
    return transaction.bookingNotification.upsert({
      where: { idempotencyKey },
      update: {},
      create: data,
    });
  }

  enqueueWaitlist(
    transaction: Prisma.TransactionClient,
    waitlistEntryId: string,
    recipientPhone: string,
    eventType: NotificationEventType,
    scheduledFor: Date,
    idempotencyKey: string,
    metadata: WaitlistEnqueueMetadata = {},
  ) {
    const data = {
      waitlistEntryId,
      waitlistOfferId: metadata.waitlistOfferId,
      recipientPhone,
      channel: NotificationChannel.SMS,
      eventType,
      scheduledFor,
      availableAt: scheduledFor,
      idempotencyKey,
      payload: metadata.payload,
    };
    return transaction.bookingNotification.upsert({
      where: { idempotencyKey },
      update: {},
      create: data,
    });
  }
}
