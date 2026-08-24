/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { AvailabilityService } from '../availability/availability.service';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { CustomerAuthService } from '../customer-account/customer-auth.service';
import { CustomerSessionService } from '../customer-account/customer-session.service';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from './bookings.service';

describe('BookingsService hold confirmation', () => {
  it('releases the hold and returns a safe conflict for a restricted customer', async () => {
    const holdToken = 'safe-test-hold-token';
    const customer = {
      id: 'customer-1',
      fullName: 'Test Müşteri',
      phone: '+905551112233',
      onlineBookingBlockedAt: new Date('2026-07-27T08:00:00.000Z'),
    };
    const prisma = {
      $transaction: jest.fn(),
      customer: {
        findUnique: jest.fn().mockResolvedValue(customer),
        findUniqueOrThrow: jest.fn().mockResolvedValue(customer),
      },
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-1',
          branchId: 'branch-1',
          status: BookingStatus.HOLD,
          holdExpiresAt: new Date(Date.now() + 60_000),
          holdTokenHash: createHash('sha256').update(holdToken).digest('hex'),
          professional: { id: 'professional-1' },
          items: [],
        }),
        update: jest.fn().mockResolvedValue({ id: 'booking-1' }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
    );
    const audit = { write: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const service = new BookingsService(
      prisma as unknown as PrismaService,
      {} as AvailabilityService,
      {} as ScheduleValidationService,
      {} as BusinessHoursService,
      {} as NotificationOutboxService,
      audit as unknown as OperationsAuditService,
      {} as CustomerAuthService,
      {} as CustomerSessionService,
    );

    await expect(
      service.confirmHold('booking-1', { holdToken }, 'customer-1', {
        ip: '127.0.0.1',
        userAgent: 'Jest',
      }),
    ).rejects.toMatchObject<ConflictException>({
      response: expect.objectContaining({
        code: 'ONLINE_BOOKING_RESTRICTED',
      }),
    });

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: BookingStatus.EXPIRED,
        holdExpiresAt: null,
        holdTokenHash: null,
      },
    });
    expect(audit.write).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'ONLINE_BOOKING_RESTRICTED',
        afterData: { holdReleased: true },
      }),
    );
  });
});
