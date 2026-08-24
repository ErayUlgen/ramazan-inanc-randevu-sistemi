import { GoneException } from '@nestjs/common';
import { BookingStatus, CalendarSubscriptionScope } from '@prisma/client';
import { createHash } from 'crypto';
import { CalendarSubscriptionsService } from './calendar-subscriptions.service';

describe('CalendarSubscriptionsService', () => {
  const token = 'calendar-secret';
  const tokenHash = createHash('sha256').update(token).digest('hex');

  it('renders a standards-based calendar without exposing customer data', async () => {
    const prisma = {
      calendarSubscription: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'subscription-1',
          tokenHash,
          label: 'Salon Takvimi',
          scope: CalendarSubscriptionScope.BRANCH,
          branchId: 'branch-1',
          professionalId: null,
          revokedAt: null,
          expiresAt: null,
          branch: { timezone: 'Europe/Istanbul' },
          professional: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      booking: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'booking-1',
            publicCode: 'RI-TEST123',
            status: BookingStatus.CONFIRMED,
            startAt: new Date('2026-07-30T07:00:00.000Z'),
            endAt: new Date('2026-07-30T08:00:00.000Z'),
            updatedAt: new Date('2026-07-28T10:00:00.000Z'),
            professional: { name: 'Ramazan İnanç' },
            items: [{ serviceName: 'Anatomik Saç Kesimi' }],
          },
        ]),
      },
    };
    const service = new CalendarSubscriptionsService(
      prisma as never,
      {} as never,
    );

    const result = await service.calendar(token);

    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('STATUS:CONFIRMED');
    expect(result).toContain('RI-TEST123');
    expect(result).not.toContain('Telefon');
    expect(prisma.calendarSubscription.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash } }),
    );
  });

  it('rejects a revoked subscription', async () => {
    const service = new CalendarSubscriptionsService(
      {
        calendarSubscription: {
          findUnique: jest.fn().mockResolvedValue({
            revokedAt: new Date(),
            expiresAt: null,
          }),
        },
      } as never,
      {} as never,
    );

    await expect(service.calendar(token)).rejects.toBeInstanceOf(GoneException);
  });
});
