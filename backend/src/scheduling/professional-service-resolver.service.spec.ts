import { BadRequestException } from '@nestjs/common';
import { BookingOccupancyKind } from '@prisma/client';
import { ProfessionalServiceResolver } from './professional-service-resolver.service';

describe('ProfessionalServiceResolver', () => {
  const findFirst = jest.fn();
  const resolver = new ProfessionalServiceResolver({
    professional: { findFirst },
  } as never);

  beforeEach(() => findFirst.mockReset());

  it('uses salon defaults when overrides are null', async () => {
    findFirst.mockResolvedValue(professionalRelation());

    const result = await resolver.resolveSelection(
      'branch-1',
      'professional-1',
      ['service-1'],
      'public',
    );

    expect(result.totalDurationMinutes).toBe(60);
    expect(result.totalPriceKurus).toBe(90_000);
    expect(result.services[0]).toMatchObject({
      durationMinutes: 60,
      priceKurus: 90_000,
      isOnlineBookable: true,
    });
  });

  it('applies duration and price overrides only to that professional', async () => {
    findFirst.mockResolvedValue(
      professionalRelation({
        durationMinutesOverride: 45,
        priceKurusOverride: 110_000,
      }),
    );

    const result = await resolver.resolveSelection(
      'branch-1',
      'professional-1',
      ['service-1'],
      'public',
    );

    expect(result.totalDurationMinutes).toBe(45);
    expect(result.totalPriceKurus).toBe(110_000);
  });

  it('does not let an override reopen a globally closed service', async () => {
    findFirst.mockResolvedValue(
      professionalRelation(
        { isOnlineBookableOverride: true },
        { isOnlineBookable: false },
      ),
    );

    await expect(
      resolver.resolveSelection(
        'branch-1',
        'professional-1',
        ['service-1'],
        'public',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps buffers busy but frees the processing interval', () => {
    const segments = resolver.buildRelativeOccupancy([
      {
        serviceId: 'service-1',
        serviceName: 'Bakım',
        sortOrder: 0,
        durationMinutes: 60,
        priceKurus: 90_000,
        isOnlineBookable: true,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 5,
        processingStartOffsetMinutes: 15,
        processingDurationMinutes: 30,
        preVisitInstructions: null,
        postVisitInstructions: null,
        salonDurationMinutes: 60,
        salonPriceKurus: 90_000,
      },
    ]);

    expect(segments).toEqual([
      {
        startOffsetMinutes: -10,
        endOffsetMinutes: 0,
        kind: BookingOccupancyKind.PRE_BUFFER,
      },
      {
        startOffsetMinutes: 0,
        endOffsetMinutes: 15,
        kind: BookingOccupancyKind.SERVICE,
      },
      {
        startOffsetMinutes: 45,
        endOffsetMinutes: 60,
        kind: BookingOccupancyKind.SERVICE,
      },
      {
        startOffsetMinutes: 60,
        endOffsetMinutes: 65,
        kind: BookingOccupancyKind.POST_BUFFER,
      },
    ]);
  });
});

function professionalRelation(
  relationOverrides: Record<string, unknown> = {},
  serviceOverrides: Record<string, unknown> = {},
) {
  return {
    id: 'professional-1',
    slug: 'uzman-1',
    name: 'Uzman',
    title: 'Anatomik Saç Kesim Uzmanı',
    isOnlineBookable: true,
    services: [
      {
        serviceId: 'service-1',
        durationMinutesOverride: null,
        priceKurusOverride: null,
        isOnlineBookableOverride: null,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        processingStartOffsetMinutes: null,
        processingDurationMinutes: 0,
        ...relationOverrides,
        service: {
          id: 'service-1',
          name: 'Anatomik Saç Kesimi',
          sortOrder: 0,
          durationMinutes: 60,
          priceKurus: 90_000,
          isActive: true,
          isOnlineBookable: true,
          preVisitInstructions: null,
          postVisitInstructions: null,
          ...serviceOverrides,
        },
      },
    ],
  };
}
