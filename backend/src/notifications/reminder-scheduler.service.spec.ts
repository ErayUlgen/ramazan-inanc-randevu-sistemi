/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';

describe('ReminderSchedulerService', () => {
  it('creates one idempotent outbox event only for due confirmed bookings', async () => {
    const now = new Date('2030-07-25T12:30:00.000Z');
    const prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'booking-due',
            status: BookingStatus.CONFIRMED,
            startAt: new Date('2030-07-25T14:30:00.000Z'),
            branch: { reminderLeadMinutes: 120 },
          },
          {
            id: 'booking-later',
            status: BookingStatus.CONFIRMED,
            startAt: new Date('2030-07-25T15:30:00.000Z'),
            branch: { reminderLeadMinutes: 120 },
          },
        ]),
      },
      bookingNotification: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new ReminderSchedulerService(
      prisma as unknown as PrismaService,
    );

    await expect(service.scheduleDueReminders(now)).resolves.toBe(1);
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: BookingStatus.CONFIRMED }),
      }),
    );
    expect(prisma.bookingNotification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          bookingId: 'booking-due',
          idempotencyKey:
            'booking:booking-due:reminder:2030-07-25T14:30:00.000Z:v1',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('does not write an outbox event when no reminder is due', async () => {
    const prisma = {
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      bookingNotification: { createMany: jest.fn() },
    };
    const service = new ReminderSchedulerService(
      prisma as unknown as PrismaService,
    );
    await expect(service.scheduleDueReminders(new Date())).resolves.toBe(0);
    expect(prisma.bookingNotification.createMany).not.toHaveBeenCalled();
  });
});
