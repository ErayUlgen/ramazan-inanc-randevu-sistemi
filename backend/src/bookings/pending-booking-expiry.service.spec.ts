/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PendingBookingExpiryService } from './pending-booking-expiry.service';

describe('PendingBookingExpiryService', () => {
  it('expires past pending requests and writes an audit trail', async () => {
    const now = new Date('2026-07-28T07:00:00.000Z');
    const transaction = {
      booking: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      adminRealtimeEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      booking: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'booking-1', branchId: 'branch-1' }])
          .mockResolvedValueOnce([]),
      },
      $transaction: jest.fn(
        (callback: (value: typeof transaction) => unknown) =>
          callback(transaction),
      ),
    };
    const audit = { write: jest.fn().mockResolvedValue(undefined) };
    const service = new PendingBookingExpiryService(
      prisma as never,
      audit as never,
    );

    await expect(service.expirePastPending(now)).resolves.toBe(1);
    expect(transaction.booking.updateMany).toHaveBeenCalledTimes(1);
    expect(audit.write).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        bookingId: 'booking-1',
        action: 'BOOKING_EXPIRED',
        afterData: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    );
    expect(transaction.adminRealtimeEvent.create).toHaveBeenCalled();
  });

  it('does nothing when there is no stale pending request', async () => {
    const prisma = {
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    const audit = { write: jest.fn() };
    const service = new PendingBookingExpiryService(
      prisma as never,
      audit as never,
    );

    await expect(service.expirePastPending()).resolves.toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });
});
