import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingOccupancyKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DatabaseReader = Prisma.TransactionClient | PrismaService;

export interface EffectiveProfessionalService {
  serviceId: string;
  serviceName: string;
  sortOrder: number;
  durationMinutes: number;
  priceKurus: number;
  isOnlineBookable: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  processingStartOffsetMinutes: number | null;
  processingDurationMinutes: number;
  preVisitInstructions: string | null;
  postVisitInstructions: string | null;
  salonDurationMinutes: number;
  salonPriceKurus: number;
}

export interface EffectiveProfessionalSelection {
  professional: {
    id: string;
    slug: string;
    name: string;
    title: string;
    isOnlineBookable: boolean;
  };
  services: EffectiveProfessionalService[];
  totalDurationMinutes: number;
  totalPriceKurus: number;
}

export interface RelativeOccupancySegment {
  startOffsetMinutes: number;
  endOffsetMinutes: number;
  kind: BookingOccupancyKind;
}

export interface AbsoluteOccupancySegment {
  professionalId: string;
  startAt: Date;
  endAt: Date;
  kind: BookingOccupancyKind;
}

@Injectable()
export class ProfessionalServiceResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveSelection(
    branchId: string,
    professionalId: string,
    rawServiceIds: string[],
    mode: 'public' | 'admin',
    reader: DatabaseReader = this.prisma,
  ): Promise<EffectiveProfessionalSelection> {
    const serviceIds = [...new Set(rawServiceIds)];
    if (!serviceIds.length) {
      throw new BadRequestException('En az bir hizmet seçilmelidir.');
    }

    const professional = await reader.professional.findFirst({
      where: {
        id: professionalId,
        branchId,
        isActive: true,
        ...(mode === 'public' ? { isOnlineBookable: true } : {}),
      },
      include: {
        services: {
          where: { serviceId: { in: serviceIds } },
          include: { service: true },
        },
      },
    });

    if (!professional || professional.services.length !== serviceIds.length) {
      throw new BadRequestException(
        'Seçilen uzman bu hizmetlerin tamamını sunmuyor.',
      );
    }

    const relationByService = new Map(
      professional.services.map((relation) => [relation.serviceId, relation]),
    );
    const services = serviceIds
      .map((serviceId) => relationByService.get(serviceId))
      .filter((relation): relation is NonNullable<typeof relation> =>
        Boolean(relation),
      )
      .sort((a, b) => a.service.sortOrder - b.service.sortOrder)
      .map((relation) => {
        const service = relation.service;
        if (!service.isActive) {
          throw new BadRequestException('Hizmet seçimi geçerli değil.');
        }
        const effective: EffectiveProfessionalService = {
          serviceId: service.id,
          serviceName: service.name,
          sortOrder: service.sortOrder,
          durationMinutes:
            relation.durationMinutesOverride ?? service.durationMinutes,
          priceKurus: relation.priceKurusOverride ?? service.priceKurus,
          isOnlineBookable:
            service.isOnlineBookable &&
            professional.isOnlineBookable &&
            relation.isOnlineBookableOverride !== false,
          bufferBeforeMinutes: relation.bufferBeforeMinutes,
          bufferAfterMinutes: relation.bufferAfterMinutes,
          processingStartOffsetMinutes: relation.processingStartOffsetMinutes,
          processingDurationMinutes: relation.processingDurationMinutes,
          preVisitInstructions: service.preVisitInstructions,
          postVisitInstructions: service.postVisitInstructions,
          salonDurationMinutes: service.durationMinutes,
          salonPriceKurus: service.priceKurus,
        };
        this.assertConfiguration(effective);
        if (mode === 'public' && !effective.isOnlineBookable) {
          throw new BadRequestException(
            'Seçilen hizmet bu uzman için online randevuya açık değil.',
          );
        }
        return effective;
      });

    return {
      professional: {
        id: professional.id,
        slug: professional.slug,
        name: professional.name,
        title: professional.title,
        isOnlineBookable: professional.isOnlineBookable,
      },
      services,
      totalDurationMinutes: services.reduce(
        (sum, service) => sum + service.durationMinutes,
        0,
      ),
      totalPriceKurus: services.reduce(
        (sum, service) => sum + service.priceKurus,
        0,
      ),
    };
  }

  buildRelativeOccupancy(
    services: EffectiveProfessionalService[],
  ): RelativeOccupancySegment[] {
    const segments: RelativeOccupancySegment[] = [];
    let cursor = 0;

    for (const service of services) {
      const serviceStart = cursor;
      const serviceEnd = serviceStart + service.durationMinutes;
      this.pushSegment(
        segments,
        serviceStart - service.bufferBeforeMinutes,
        serviceStart,
        BookingOccupancyKind.PRE_BUFFER,
      );

      const processingStart =
        service.processingStartOffsetMinutes == null
          ? null
          : serviceStart + service.processingStartOffsetMinutes;
      const processingEnd =
        processingStart == null
          ? null
          : processingStart + service.processingDurationMinutes;

      if (
        processingStart == null ||
        processingEnd == null ||
        service.processingDurationMinutes === 0
      ) {
        this.pushSegment(
          segments,
          serviceStart,
          serviceEnd,
          BookingOccupancyKind.SERVICE,
        );
      } else {
        this.pushSegment(
          segments,
          serviceStart,
          processingStart,
          BookingOccupancyKind.SERVICE,
        );
        this.pushSegment(
          segments,
          processingEnd,
          serviceEnd,
          BookingOccupancyKind.SERVICE,
        );
      }

      this.pushSegment(
        segments,
        serviceEnd,
        serviceEnd + service.bufferAfterMinutes,
        BookingOccupancyKind.POST_BUFFER,
      );
      cursor = serviceEnd;
    }

    return segments;
  }

  buildAbsoluteOccupancy(
    professionalId: string,
    startAt: Date,
    services: EffectiveProfessionalService[],
  ): AbsoluteOccupancySegment[] {
    return this.buildRelativeOccupancy(services).map((segment) => ({
      professionalId,
      startAt: new Date(
        startAt.getTime() + segment.startOffsetMinutes * 60_000,
      ),
      endAt: new Date(startAt.getTime() + segment.endOffsetMinutes * 60_000),
      kind: segment.kind,
    }));
  }

  toBookingItemCreate(service: EffectiveProfessionalService, index: number) {
    return {
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      durationMinutes: service.durationMinutes,
      priceKurus: service.priceKurus,
      preVisitInstructionsSnapshot: service.preVisitInstructions,
      postVisitInstructionsSnapshot: service.postVisitInstructions,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      processingStartOffsetMinutes: service.processingStartOffsetMinutes,
      processingDurationMinutes: service.processingDurationMinutes,
      sortOrder: index,
    };
  }

  private assertConfiguration(service: EffectiveProfessionalService) {
    const values = [
      service.durationMinutes,
      service.priceKurus,
      service.bufferBeforeMinutes,
      service.bufferAfterMinutes,
      service.processingDurationMinutes,
    ];
    if (
      values.some((value) => value < 0) ||
      service.durationMinutes <= 0 ||
      service.priceKurus < 0
    ) {
      throw new BadRequestException(
        'Uzman hizmet ayarlarında negatif veya geçersiz değer bulunuyor.',
      );
    }
    const minuteValues = [
      service.durationMinutes,
      service.bufferBeforeMinutes,
      service.bufferAfterMinutes,
      service.processingDurationMinutes,
      ...(service.processingStartOffsetMinutes == null
        ? []
        : [service.processingStartOffsetMinutes]),
    ];
    if (minuteValues.some((value) => value % 5 !== 0)) {
      throw new BadRequestException(
        'Uzman hizmet süreleri beş dakikanın katı olmalıdır.',
      );
    }
    if (
      service.processingStartOffsetMinutes == null &&
      service.processingDurationMinutes !== 0
    ) {
      throw new BadRequestException(
        'İşlem bekleme süresi için başlangıç zamanı seçilmelidir.',
      );
    }
    if (
      service.processingStartOffsetMinutes != null &&
      (service.processingStartOffsetMinutes < 0 ||
        service.processingStartOffsetMinutes +
          service.processingDurationMinutes >
          service.durationMinutes)
    ) {
      throw new BadRequestException(
        'İşlem bekleme aşaması hizmet süresinin dışına taşamaz.',
      );
    }
  }

  private pushSegment(
    segments: RelativeOccupancySegment[],
    startOffsetMinutes: number,
    endOffsetMinutes: number,
    kind: BookingOccupancyKind,
  ) {
    if (endOffsetMinutes <= startOffsetMinutes) return;
    segments.push({ startOffsetMinutes, endOffsetMinutes, kind });
  }
}
