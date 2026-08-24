import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getBranch(slug: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { slug },
      include: {
        services: {
          where: { isActive: true, isOnlineBookable: true },
          orderBy: { sortOrder: 'asc' },
        },
        professionals: {
          where: { isActive: true, isOnlineBookable: true },
          orderBy: { sortOrder: 'asc' },
          include: { services: true },
        },
      },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');

    return {
      id: branch.id,
      slug: branch.slug,
      name: branch.name,
      city: branch.city,
      district: branch.district,
      address: branch.address,
      timezone: branch.timezone,
      openingTime: this.toTime(branch.openingMinute),
      closingTime: this.toTime(branch.closingMinute),
      arrivalLeadMinutes: branch.arrivalLeadMinutes,
      reminderLeadMinutes: branch.reminderLeadMinutes,
      requiresBookingApproval: branch.requiresBookingApproval,
      services: branch.services.map((service) => {
        const relations = branch.professionals
          .filter(
            (professional) =>
              professional.isActive && professional.isOnlineBookable,
          )
          .flatMap((professional) =>
            professional.services.filter(
              (relation) =>
                relation.serviceId === service.id &&
                relation.isOnlineBookableOverride !== false,
            ),
          );
        const durations = relations.map(
          (relation) =>
            relation.durationMinutesOverride ?? service.durationMinutes,
        );
        const prices = relations.map(
          (relation) => relation.priceKurusOverride ?? service.priceKurus,
        );
        return {
          ...service,
          durationRange: {
            min: durations.length
              ? Math.min(...durations)
              : service.durationMinutes,
            max: durations.length
              ? Math.max(...durations)
              : service.durationMinutes,
          },
          priceRange: {
            min: prices.length ? Math.min(...prices) : service.priceKurus,
            max: prices.length ? Math.max(...prices) : service.priceKurus,
          },
          variesByProfessional:
            new Set(durations).size > 1 || new Set(prices).size > 1,
        };
      }),
      professionals: branch.professionals.map(
        ({ services, ...professional }) => ({
          ...professional,
          serviceIds: services.map((item) => item.serviceId),
          serviceConfigurations: services.map((item) => ({
            serviceId: item.serviceId,
            durationMinutesOverride: item.durationMinutesOverride,
            priceKurusOverride: item.priceKurusOverride,
            isOnlineBookableOverride: item.isOnlineBookableOverride,
            bufferBeforeMinutes: item.bufferBeforeMinutes,
            bufferAfterMinutes: item.bufferAfterMinutes,
            processingStartOffsetMinutes: item.processingStartOffsetMinutes,
            processingDurationMinutes: item.processingDurationMinutes,
          })),
        }),
      ),
    };
  }

  private toTime(minute: number): string {
    return `${Math.floor(minute / 60)
      .toString()
      .padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`;
  }
}
