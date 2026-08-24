/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BookingStatus,
  NotificationEventType,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationWorkerService } from './notification-worker.service';
import { SmsGatewayService } from './sms-gateway.service';

describe('NotificationWorkerService', () => {
  const notification = {
    id: 'notification-1',
    bookingId: 'booking-1',
    eventType: NotificationEventType.BOOKING_APPROVED,
    status: NotificationStatus.PROCESSING,
    idempotencyKey: 'booking:booking-1:approved:v1',
    attemptCount: 0,
    maxAttempts: 4,
    booking: {
      id: 'booking-1',
      publicCode: 'RI-TEST1234',
      status: BookingStatus.CONFIRMED,
      startAt: new Date(Date.now() + 3_600_000),
      customer: { phone: '+905551112233' },
      professional: { name: 'Ramazan İnanç' },
    },
  };

  const makeWorker = (record = notification) => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: record.id }]),
      bookingNotification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
      ),
      bookingNotification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(record),
        update: jest.fn().mockResolvedValue(record),
      },
    };
    const sms = { send: jest.fn() };
    return {
      worker: new NotificationWorkerService(
        prisma as unknown as PrismaService,
        sms as unknown as SmsGatewayService,
      ),
      prisma,
      sms,
    };
  };

  it('marks a provider-accepted message as sent', async () => {
    const { worker, prisma, sms } = makeWorker();
    sms.send.mockResolvedValue({
      accepted: true,
      provider: 'development',
      providerMessageId: 'dev-1',
      responseCode: 'DEV_ACCEPTED',
    });

    await expect(worker.processDue()).resolves.toBe(1);
    expect(sms.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+905551112233' }),
    );
    expect(prisma.bookingNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationStatus.SENT }),
      }),
    );
  });

  it('schedules a retry for a temporary provider failure', async () => {
    const { worker, prisma, sms } = makeWorker();
    sms.send.mockResolvedValue({
      accepted: false,
      provider: 'development',
      retryable: true,
      errorCode: 'TEMPORARY_PROVIDER_FAILURE',
    });

    await worker.processDue();
    expect(prisma.bookingNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.RETRY_SCHEDULED,
          attemptCount: 1,
        }),
      }),
    );
  });

  it('skips a reminder when the booking is no longer confirmed', async () => {
    const cancelledReminder = {
      ...notification,
      eventType: NotificationEventType.BOOKING_REMINDER,
      booking: { ...notification.booking, status: BookingStatus.CANCELLED },
    };
    const { worker, prisma, sms } = makeWorker(cancelledReminder);

    await worker.processDue();
    expect(sms.send).not.toHaveBeenCalled();
    expect(prisma.bookingNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationStatus.SKIPPED }),
      }),
    );
  });

  it('skips an outbox item that belongs to an older booking revision', async () => {
    const staleNotification = {
      ...notification,
      bookingRevision: 2,
      booking: {
        ...notification.booking,
        revision: 3,
        customerPhoneSnapshot: '+905550001122',
      },
    };
    const { worker, prisma, sms } = makeWorker(staleNotification);

    await worker.processDue();

    expect(sms.send).not.toHaveBeenCalled();
    expect(prisma.bookingNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.SKIPPED,
          lastErrorCode: 'STALE_BOOKING_REVISION',
        }),
      }),
    );
  });

  it('uses the immutable booking phone snapshot instead of a changed customer profile', async () => {
    const snapshotNotification = {
      ...notification,
      booking: {
        ...notification.booking,
        customerPhoneSnapshot: '+905550001122',
        notificationsEnabled: true,
        revision: 1,
        customer: { phone: '+905559998877' },
      },
    };
    const { worker, sms } = makeWorker(snapshotNotification);
    sms.send.mockResolvedValue({
      accepted: true,
      provider: 'development',
      providerMessageId: 'dev-snapshot',
      responseCode: 'DEV_ACCEPTED',
    });

    await worker.processDue();

    expect(sms.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+905550001122' }),
    );
  });

  it('skips delivery when notifications were disabled on the booking', async () => {
    const mutedNotification = {
      ...notification,
      booking: {
        ...notification.booking,
        notificationsEnabled: false,
        customerPhoneSnapshot: '+905550001122',
      },
    };
    const { worker, prisma, sms } = makeWorker(mutedNotification);

    await worker.processDue();

    expect(sms.send).not.toHaveBeenCalled();
    expect(prisma.bookingNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.SKIPPED,
          lastErrorCode: 'NOTIFICATIONS_DISABLED',
        }),
      }),
    );
  });

  it('skips a reminder that still points at the appointment start before reschedule', async () => {
    const currentStart = new Date(Date.now() + 7_200_000);
    const staleReminder = {
      ...notification,
      eventType: NotificationEventType.BOOKING_REMINDER,
      appointmentStartAt: new Date(Date.now() + 3_600_000),
      bookingRevision: 4,
      booking: {
        ...notification.booking,
        startAt: currentStart,
        revision: 4,
        notificationsEnabled: true,
        customerPhoneSnapshot: '+905550001122',
      },
    };
    const { worker, prisma, sms } = makeWorker(staleReminder);

    await worker.processDue();

    expect(sms.send).not.toHaveBeenCalled();
    expect(prisma.bookingNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.SKIPPED,
          lastErrorCode: 'BOOKING_NOT_CONFIRMABLE',
        }),
      }),
    );
  });
});
