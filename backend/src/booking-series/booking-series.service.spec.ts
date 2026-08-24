import { BookingSeriesFrequency } from '@prisma/client';
import { BookingSeriesService } from './booking-series.service';

describe('BookingSeriesService date generation', () => {
  const service = new BookingSeriesService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const generateDates = (
    service as unknown as {
      generateDates(input: {
        startDate: string;
        startTime: string;
        professionalId: string;
        serviceId: string;
        frequency: BookingSeriesFrequency;
        occurrenceCount: number;
      }): string[];
    }
  ).generateDates.bind(service);

  const base = {
    startTime: '10:00',
    professionalId: 'professional-1',
    serviceId: 'service-1',
  };

  it('generates weekly and biweekly occurrences deterministically', () => {
    expect(
      generateDates({
        ...base,
        startDate: '2026-07-27',
        frequency: BookingSeriesFrequency.WEEKLY,
        occurrenceCount: 3,
      }),
    ).toEqual(['2026-07-27', '2026-08-03', '2026-08-10']);
    expect(
      generateDates({
        ...base,
        startDate: '2026-07-27',
        frequency: BookingSeriesFrequency.BIWEEKLY,
        occurrenceCount: 3,
      }),
    ).toEqual(['2026-07-27', '2026-08-10', '2026-08-24']);
  });

  it('clamps month-end occurrences instead of overflowing', () => {
    expect(
      generateDates({
        ...base,
        startDate: '2026-01-31',
        frequency: BookingSeriesFrequency.MONTHLY,
        occurrenceCount: 3,
      }),
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
});
