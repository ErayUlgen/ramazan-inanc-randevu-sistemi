/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { ScheduleValidationService } from './schedule-validation.service';

describe('ScheduleValidationService', () => {
  const makeService = (intervals = [{ startMinute: 600, endMinute: 1260 }]) => {
    const hours = {
      resolveEffectiveIntervals: jest.fn().mockResolvedValue(intervals),
    };
    const transaction = {
      booking: { findFirst: jest.fn().mockResolvedValue(null) },
      scheduleBlock: { findFirst: jest.fn().mockResolvedValue(null) },
      bookingChangeRequest: { findFirst: jest.fn().mockResolvedValue(null) },
      waitlistOffer: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    return {
      service: new ScheduleValidationService(
        hours as unknown as BusinessHoursService,
      ),
      hours,
      transaction,
    };
  };

  const base = {
    branchId: 'branch-1',
    professionalId: 'professional-1',
    startAt: new Date('2026-07-24T07:00:00.000Z'),
    endAt: new Date('2026-07-24T08:00:00.000Z'),
  };

  it('accepts an exact [start, end) fit inside an effective interval', async () => {
    const { service, transaction } = makeService();

    await expect(
      service.assertAvailable(
        transaction as unknown as Prisma.TransactionClient,
        base,
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a service that crosses a split working interval', async () => {
    const { service, transaction } = makeService([
      { startMinute: 600, endMinute: 780 },
      { startMinute: 840, endMinute: 1260 },
    ]);

    await expect(
      service.assertAvailable(
        transaction as unknown as Prisma.TransactionClient,
        {
          ...base,
          startAt: new Date('2026-07-24T09:30:00.000Z'),
          endAt: new Date('2026-07-24T11:30:00.000Z'),
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses the same overlap rule for confirmed bookings and schedule blocks', async () => {
    const { service, transaction } = makeService();
    transaction.scheduleBlock.findFirst.mockResolvedValue({ id: 'block-1' });

    await expect(
      service.assertAvailable(
        transaction as unknown as Prisma.TransactionClient,
        base,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transaction.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { lt: base.endAt },
          endAt: { gt: base.startAt },
        }),
      }),
    );
    expect(transaction.scheduleBlock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { professionalId: base.professionalId },
            { professionalId: null },
          ],
        }),
      }),
    );
  });

  it('passes excludeBookingId when validating a reschedule', async () => {
    const { service, transaction } = makeService();

    await service.assertAvailable(
      transaction as unknown as Prisma.TransactionClient,
      { ...base, excludeBookingId: 'booking-being-moved' },
    );

    expect(transaction.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'booking-being-moved' },
        }),
      }),
    );
  });
});
