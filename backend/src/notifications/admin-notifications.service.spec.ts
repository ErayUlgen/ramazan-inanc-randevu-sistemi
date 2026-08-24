/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminNotificationsService } from './admin-notifications.service';

describe('AdminNotificationsService', () => {
  const makeService = () => {
    const bookingNotification = {
      findUnique: jest.fn(),
      update: jest.fn(),
    };
    const transaction = { bookingNotification };
    const prisma = {
      $transaction: jest.fn(
        (callback: (value: typeof transaction) => unknown) =>
          Promise.resolve(callback(transaction)),
      ),
      bookingNotification,
    };
    const audit = { write: jest.fn().mockResolvedValue(undefined) };
    return {
      service: new AdminNotificationsService(
        prisma as unknown as PrismaService,
        audit as unknown as OperationsAuditService,
      ),
      prisma,
      audit,
    };
  };

  it('never retries a notification already accepted by the provider', async () => {
    const { service, prisma } = makeService();
    prisma.bookingNotification.findUnique.mockResolvedValue({
      id: 'notification-1',
      status: NotificationStatus.SENT,
      attemptCount: 1,
      maxAttempts: 4,
      lastErrorCode: null,
      bookingId: 'booking-1',
      booking: { branchId: 'branch-1' },
    });

    await expect(service.retry('notification-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.bookingNotification.update).not.toHaveBeenCalled();
  });

  it('requeues only a known transient failure', async () => {
    const { service, prisma, audit } = makeService();
    const failed = {
      id: 'notification-1',
      eventType: 'BOOKING_APPROVED',
      channel: 'SMS',
      status: NotificationStatus.FAILED,
      scheduledFor: new Date(),
      availableAt: new Date(),
      attemptCount: 1,
      maxAttempts: 4,
      lastAttemptAt: new Date(),
      sentAt: null,
      failedAt: new Date(),
      provider: 'development',
      providerResponseCode: null,
      lastErrorCode: 'TEMPORARY_PROVIDER_FAILURE',
      lastErrorMessage: 'Temporary',
      createdAt: new Date(),
      bookingId: 'booking-1',
      booking: { branchId: 'branch-1' },
    };
    prisma.bookingNotification.findUnique.mockResolvedValue(failed);
    prisma.bookingNotification.update.mockResolvedValue({
      ...failed,
      status: NotificationStatus.PENDING,
      failedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    });

    const result = await service.retry('notification-1');
    expect(result.status).toBe(NotificationStatus.PENDING);
    expect(prisma.bookingNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationStatus.PENDING }),
      }),
    );
    expect(audit.write).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'NOTIFICATION_MANUALLY_RETRIED',
        bookingId: 'booking-1',
      }),
    );
  });
});
