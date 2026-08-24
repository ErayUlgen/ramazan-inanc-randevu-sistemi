import { Prisma } from '@prisma/client';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { ProfessionalAvailabilityService } from './professional-availability.service';

describe('ProfessionalAvailabilityService', () => {
  const salonIntervals = [{ startMinute: 600, endMinute: 1260 }];

  it('returns the shared salon hours independently of the professional', async () => {
    const hours = {
      resolveEffectiveIntervals: jest.fn().mockResolvedValue(salonIntervals),
    };
    const service = new ProfessionalAvailabilityService(
      hours as unknown as BusinessHoursService,
    );

    await expect(
      service.resolveEffectiveIntervals(
        'branch-1',
        'professional-1',
        '2030-07-22',
      ),
    ).resolves.toEqual(salonIntervals);
    await expect(
      service.resolveEffectiveIntervals(
        'branch-1',
        'professional-2',
        '2030-07-22',
      ),
    ).resolves.toEqual(salonIntervals);

    expect(hours.resolveEffectiveIntervals).toHaveBeenNthCalledWith(
      1,
      'branch-1',
      '2030-07-22',
    );
    expect(hours.resolveEffectiveIntervals).toHaveBeenNthCalledWith(
      2,
      'branch-1',
      '2030-07-22',
    );
  });

  it('forwards the active transaction reader to salon hours', async () => {
    const hours = {
      resolveEffectiveIntervals: jest.fn().mockResolvedValue(salonIntervals),
    };
    const service = new ProfessionalAvailabilityService(
      hours as unknown as BusinessHoursService,
    );
    const reader = {} as Pick<
      Prisma.TransactionClient,
      'branchDateOverride' | 'branchWeeklyInterval'
    >;

    await service.resolveEffectiveIntervals(
      'branch-1',
      'professional-1',
      '2030-07-22',
      reader,
    );

    expect(hours.resolveEffectiveIntervals).toHaveBeenCalledWith(
      'branch-1',
      '2030-07-22',
      reader,
    );
  });
});
