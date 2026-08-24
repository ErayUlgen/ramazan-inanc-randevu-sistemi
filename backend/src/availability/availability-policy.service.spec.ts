import { BadRequestException } from '@nestjs/common';
import { BookingPolicyService } from '../booking-policy/booking-policy.service';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityEngine } from './availability.engine';
import { AvailabilityService } from './availability.service';
import { ProfessionalAvailabilityService } from './professional-availability.service';
import { ProfessionalServiceResolver } from '../scheduling/professional-service-resolver.service';

describe('AvailabilityService public booking policies', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2030-07-22T07:01:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const makeService = (overrides?: {
    policy?: Partial<{
      bookingWindowDays: number;
      minimumBookingNoticeMinutes: number;
      sameDayBookingCutoffMinute: number | null;
    }>;
    resolveProfessional?: (
      date: string,
    ) => Promise<Array<{ startMinute: number; endMinute: number }>>;
  }) => {
    const prisma = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'branch-1',
          slug: 'studio',
          name: 'Studio',
          timezone: 'Europe/Istanbul',
          isActive: true,
        }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'service-1',
            durationMinutes: 60,
            priceKurus: 90_000,
          },
        ]),
      },
      professional: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'professional-1',
            name: 'Ramazan İnanç',
            title: 'Anatomik Saç Kesim Uzmanı',
            services: [{ serviceId: 'service-1' }],
          },
        ]),
      },
      booking: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      scheduleBlock: { findMany: jest.fn().mockResolvedValue([]) },
      bookingChangeRequest: { findMany: jest.fn().mockResolvedValue([]) },
      waitlistOffer: { findMany: jest.fn().mockResolvedValue([]) },
      bookingOccupancySegment: { findMany: jest.fn().mockResolvedValue([]) },
      bookingChangeOccupancySegment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      waitlistOfferOccupancySegment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const policy = {
      bookingWindowDays: 30,
      minimumBookingNoticeMinutes: 0,
      sameDayBookingCutoffMinute: null,
      ...overrides?.policy,
    };
    const policies = {
      get: jest.fn().mockResolvedValue(policy),
      getBySlug: jest.fn().mockResolvedValue(policy),
    };
    const hours = {
      resolveEffectiveIntervals: jest
        .fn()
        .mockResolvedValue([{ startMinute: 600, endMinute: 1260 }]),
    };
    const professionalAvailability = {
      resolveEffectiveIntervals: jest.fn(
        (_branchId: string, _professionalId: string, date: string) =>
          overrides?.resolveProfessional?.(date) ??
          Promise.resolve([{ startMinute: 600, endMinute: 1260 }]),
      ),
    };
    const engine = {
      buildCandidateStartsForIntervals: jest
        .fn()
        .mockImplementation(
          (intervals: Array<{ startMinute: number; endMinute: number }>) =>
            intervals.length ? [600, 720] : [],
        ),
      toTimeLabel: jest.fn(
        (minute: number) =>
          `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
      ),
      buildCandidateStartsForPattern: jest
        .fn()
        .mockImplementation(
          (intervals: Array<{ startMinute: number; endMinute: number }>) =>
            intervals.length ? [600, 720] : [],
        ),
    };
    const resolver = {
      resolveSelection: jest.fn().mockResolvedValue({
        professional: {
          id: 'professional-1',
          name: 'Ramazan İnanç',
          title: 'Anatomik Saç Kesim Uzmanı',
          slug: 'ramazan-inanc',
          isOnlineBookable: true,
        },
        services: [
          {
            serviceId: 'service-1',
            serviceName: 'Anatomik Saç Kesimi',
            sortOrder: 0,
            durationMinutes: 60,
            priceKurus: 90_000,
            isOnlineBookable: true,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
            processingStartOffsetMinutes: null,
            processingDurationMinutes: 0,
            preVisitInstructions: null,
            postVisitInstructions: null,
            salonDurationMinutes: 60,
            salonPriceKurus: 90_000,
          },
        ],
        totalDurationMinutes: 60,
        totalPriceKurus: 90_000,
      }),
      buildRelativeOccupancy: jest.fn().mockReturnValue([
        {
          startOffsetMinutes: 0,
          endOffsetMinutes: 60,
          kind: 'SERVICE',
        },
      ]),
    };
    return {
      prisma,
      policies,
      service: new AvailabilityService(
        prisma as unknown as PrismaService,
        engine as unknown as AvailabilityEngine,
        hours as unknown as BusinessHoursService,
        policies as unknown as BookingPolicyService,
        professionalAvailability as unknown as ProfessionalAvailabilityService,
        resolver as unknown as ProfessionalServiceResolver,
      ),
    };
  };

  it('rejects past dates and dates beyond the configured window', async () => {
    const { service } = makeService({ policy: { bookingWindowDays: 7 } });

    await expect(
      service.getForBranch('studio', {
        date: '2030-07-21',
        serviceIds: 'service-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getForBranch('studio', {
        date: '2030-07-30',
        serviceIds: 'service-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filters slots below minimum notice while admin availability stays unaffected', async () => {
    const { service, policies } = makeService({
      policy: { minimumBookingNoticeMinutes: 90 },
    });

    const publicResult = await service.getForBranch('studio', {
      date: '2030-07-22',
      serviceIds: 'service-1',
    });
    const adminResult = await service.getForAdmin({
      branchSlug: 'studio',
      date: '2030-07-22',
      serviceIds: 'service-1',
    });

    expect(publicResult.slots.map((slot) => slot.startTime)).toEqual(['12:00']);
    expect(adminResult.slots.map((slot) => slot.startTime)).toEqual([
      '10:00',
      '12:00',
    ]);
    expect(policies.get).toHaveBeenCalledTimes(1);
  });

  it('returns no public slots after the same-day cutoff', async () => {
    const { service } = makeService({
      policy: { sameDayBookingCutoffMinute: 600 },
    });

    const result = await service.getForBranch('studio', {
      date: '2030-07-22',
      serviceIds: 'service-1',
    });

    expect(result.slots).toEqual([]);
  });
});
