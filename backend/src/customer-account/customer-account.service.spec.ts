/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BookingStatus } from '@prisma/client';
import { BookingChangeRequestsService } from '../booking-changes/booking-change-requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerAccountService } from './customer-account.service';
import { CustomerBookingView } from './dto/list-customer-bookings.dto';

describe('CustomerAccountService time-derived booking groups', () => {
  const createService = () => {
    const prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    return {
      prisma,
      service: new CustomerAccountService(
        prisma as unknown as PrismaService,
        {} as BookingChangeRequestsService,
      ),
    };
  };

  it('keeps a confirmed appointment upcoming until its end time', async () => {
    const { prisma, service } = createService();

    await service.listBookings('customer-1', {
      view: CustomerBookingView.UPCOMING,
    });

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'customer-1',
          status: BookingStatus.CONFIRMED,
          endAt: { gt: expect.any(Date) },
        }),
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('does not expose a past pending request while the expiry job catches up', async () => {
    const { prisma, service } = createService();

    await service.listBookings('customer-1', {
      view: CustomerBookingView.PENDING,
    });

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: BookingStatus.PENDING_APPROVAL,
          startAt: { gt: expect.any(Date) },
        }),
      }),
    );
  });
});
