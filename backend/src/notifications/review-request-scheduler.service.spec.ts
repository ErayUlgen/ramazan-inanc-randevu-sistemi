/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BookingStatus, VisitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewRequestSchedulerService } from './review-request-scheduler.service';

describe('ReviewRequestSchedulerService', () => {
  it('schedules one secure review link exactly thirty minutes after the appointment ends', async () => {
    const now = new Date('2030-07-25T10:30:00.000Z');
    const candidate = {
      id: 'booking-1',
      branchId: 'branch-1',
      customerId: 'customer-1',
      professionalId: 'professional-1',
      status: BookingStatus.CONFIRMED,
      visitStatus: VisitStatus.SCHEDULED,
      startAt: new Date('2030-07-25T09:00:00.000Z'),
      endAt: new Date('2030-07-25T10:00:00.000Z'),
      customerPhoneSnapshot: '+905551112233',
      notificationsEnabled: true,
      branch: {
        bookingPolicy: {
          reviewRequestEnabled: true,
          reviewRequestDelayMinutes: 30,
          reviewRequestExpiryDays: 30,
        },
      },
      review: null,
    };
    const transaction = {
      booking: { findUnique: jest.fn().mockResolvedValue(candidate) },
      bookingReview: { upsert: jest.fn().mockResolvedValue({}) },
      bookingNotification: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      booking: { findMany: jest.fn().mockResolvedValue([candidate]) },
      $transaction: jest.fn(
        (callback: (value: typeof transaction) => unknown) =>
          Promise.resolve(callback(transaction)),
      ),
    };
    const scheduler = new ReviewRequestSchedulerService(
      prisma as unknown as PrismaService,
    );

    await expect(scheduler.scheduleDue(now)).resolves.toBe(1);
    expect(transaction.bookingReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          professionalId: 'professional-1',
        }),
      }),
    );
    expect(transaction.bookingNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scheduledFor: now,
        availableAt: now,
        idempotencyKey: 'booking:booking-1:review-request:auto:v2',
        payload: expect.objectContaining({
          actionTokenEnvelope: expect.any(String),
        }),
      }),
    });
  });

  it('does not request a review before the configured delay has elapsed', async () => {
    const prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'booking-early',
            endAt: new Date('2030-07-25T10:00:00.000Z'),
            branch: {
              bookingPolicy: {
                reviewRequestDelayMinutes: 30,
                reviewRequestExpiryDays: 30,
              },
            },
          },
        ]),
      },
      $transaction: jest.fn(),
    };
    const scheduler = new ReviewRequestSchedulerService(
      prisma as unknown as PrismaService,
    );

    await expect(
      scheduler.scheduleDue(new Date('2030-07-25T10:29:59.000Z')),
    ).resolves.toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
