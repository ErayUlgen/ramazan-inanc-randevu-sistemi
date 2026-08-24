import { CapacityCalculationService } from './capacity-calculation.service';

describe('CapacityCalculationService', () => {
  it('merges overlapping blocks and never double subtracts capacity', async () => {
    const prisma = {
      professional: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'professional-1', name: 'Ramazan İnanç' }]),
      },
      scheduleBlock: {
        findMany: jest.fn().mockResolvedValue([
          {
            professionalId: null,
            startAt: at('10:30'),
            endAt: at('11:00'),
          },
          {
            professionalId: 'professional-1',
            startAt: at('10:45'),
            endAt: at('11:15'),
          },
        ]),
      },
      bookingOccupancySegment: {
        findMany: jest.fn().mockResolvedValue([
          {
            professionalId: 'professional-1',
            startAt: at('10:00'),
            endAt: at('10:30'),
          },
          {
            professionalId: 'professional-1',
            startAt: at('11:15'),
            endAt: at('12:00'),
          },
        ]),
      },
    };
    const availability = {
      resolveEffectiveIntervals: jest
        .fn()
        .mockResolvedValue([{ startMinute: 600, endMinute: 720 }]),
    };
    const service = new CapacityCalculationService(
      prisma as never,
      availability as never,
    );

    const result = await service.calculate({
      branchId: 'branch-1',
      from: '2026-07-27',
      to: '2026-07-27',
    });

    expect(result.capacityMinutes).toBe(75);
    expect(result.occupiedMinutes).toBe(75);
    expect(result.occupancyPercent).toBe(100);
  });

  it('returns zero percent instead of NaN for zero capacity', async () => {
    const service = new CapacityCalculationService(
      {
        professional: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as never,
      {} as never,
    );

    const result = await service.calculate({
      branchId: 'branch-1',
      from: '2026-07-27',
      to: '2026-07-27',
    });

    expect(result).toMatchObject({
      capacityMinutes: 0,
      occupiedMinutes: 0,
      occupancyPercent: 0,
    });
  });
});

function at(time: string) {
  return new Date(`2026-07-27T${time}:00+03:00`);
}
