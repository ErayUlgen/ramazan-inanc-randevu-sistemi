import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditActorType, BookingStatus, Prisma } from '@prisma/client';
import { slugifyTurkish } from '../common/slug';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfessionalDto } from './dto/upsert-professional.dto';
import { UpsertServiceDto } from './dto/upsert-service.dto';
import { UpdateProfessionalServiceDto } from './dto/update-professional-service.dto';

const ACTIVE_BOOKINGS: BookingStatus[] = [
  BookingStatus.HOLD,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async listServices(branchId: string) {
    await this.requireBranch(branchId);
    const services = await this.prisma.service.findMany({
      where: { branchId },
      include: {
        professionals: {
          include: {
            professional: { select: { id: true, name: true, isActive: true } },
          },
        },
        _count: { select: { bookingItems: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return services.map((service) => ({
      id: service.id,
      slug: service.slug,
      name: service.name,
      category: service.category,
      description: service.description,
      preVisitInstructions: service.preVisitInstructions,
      postVisitInstructions: service.postVisitInstructions,
      durationMinutes: service.durationMinutes,
      priceKurus: service.priceKurus,
      isActive: service.isActive,
      isOnlineBookable: service.isOnlineBookable,
      sortOrder: service.sortOrder,
      professionalIds: service.professionals.map((item) => item.professionalId),
      professionals: service.professionals.map((item) => item.professional),
      historicalBookingCount: service._count.bookingItems,
      updatedAt: service.updatedAt.toISOString(),
    }));
  }

  async createService(dto: UpsertServiceDto) {
    await this.requireBranch(dto.branchId);
    this.validateService(dto);
    const professionalIds = [...new Set(dto.professionalIds ?? [])];
    await this.validateProfessionals(dto.branchId, professionalIds);
    const id = await this.prisma.$transaction(async (transaction) => {
      const service = await transaction.service.create({
        data: {
          branchId: dto.branchId,
          slug: await this.availableServiceSlug(
            transaction,
            dto.branchId,
            dto.name,
          ),
          name: dto.name.trim(),
          category: dto.category.trim(),
          description: dto.description.trim(),
          preVisitInstructions: dto.preVisitInstructions?.trim() || null,
          postVisitInstructions: dto.postVisitInstructions?.trim() || null,
          durationMinutes: dto.durationMinutes,
          priceKurus: dto.priceKurus,
          isActive: dto.isActive,
          isOnlineBookable: dto.isActive && dto.isOnlineBookable,
          sortOrder: dto.sortOrder,
          professionals: {
            create: professionalIds.map((professionalId) => ({
              professionalId,
            })),
          },
        },
      });
      await this.audit.write(transaction, {
        branchId: dto.branchId,
        entityType: 'SERVICE',
        entityId: service.id,
        action: 'SERVICE_CREATED',
        actorType: AuditActorType.ADMIN,
        afterData: this.serviceSnapshot(service, professionalIds),
      });
      return service.id;
    });
    return this.findService(id);
  }

  async updateService(id: string, dto: UpsertServiceDto) {
    const existing = await this.prisma.service.findUnique({
      where: { id },
      include: { professionals: true },
    });
    if (!existing) throw new NotFoundException('Hizmet bulunamadı.');
    if (existing.branchId !== dto.branchId) {
      throw new BadRequestException('Hizmet başka bir salona taşınamaz.');
    }
    this.validateService(dto);
    const professionalIds = [...new Set(dto.professionalIds ?? [])];
    await this.validateProfessionals(dto.branchId, professionalIds);
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.service.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          category: dto.category.trim(),
          description: dto.description.trim(),
          preVisitInstructions: dto.preVisitInstructions?.trim() || null,
          postVisitInstructions: dto.postVisitInstructions?.trim() || null,
          durationMinutes: dto.durationMinutes,
          priceKurus: dto.priceKurus,
          isActive: dto.isActive,
          isOnlineBookable: dto.isActive && dto.isOnlineBookable,
          sortOrder: dto.sortOrder,
        },
      });
      await transaction.professionalService.deleteMany({
        where: {
          serviceId: id,
          professionalId: { notIn: professionalIds },
        },
      });
      const previousIds = new Set(
        existing.professionals.map((item) => item.professionalId),
      );
      await transaction.professionalService.createMany({
        data: professionalIds
          .filter((professionalId) => !previousIds.has(professionalId))
          .map((professionalId) => ({ professionalId, serviceId: id })),
        skipDuplicates: true,
      });
      await this.audit.write(transaction, {
        branchId: dto.branchId,
        entityType: 'SERVICE',
        entityId: id,
        action: 'SERVICE_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: this.serviceSnapshot(
          existing,
          existing.professionals.map((item) => item.professionalId),
        ),
        afterData: this.serviceSnapshot(updated, professionalIds),
      });
    });
    return this.findService(id);
  }

  async listProfessionals(branchId: string) {
    await this.requireBranch(branchId);
    const professionals = await this.prisma.professional.findMany({
      where: { branchId },
      include: {
        services: {
          include: {
            service: { select: { id: true, name: true, isActive: true } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return professionals.map((professional) => ({
      id: professional.id,
      slug: professional.slug,
      name: professional.name,
      title: professional.title,
      bio: professional.bio,
      photoUrl: professional.photoUrl,
      isActive: professional.isActive,
      isOnlineBookable: professional.isOnlineBookable,
      sortOrder: professional.sortOrder,
      serviceIds: professional.services.map((item) => item.serviceId),
      services: professional.services.map((item) => item.service),
      updatedAt: professional.updatedAt.toISOString(),
    }));
  }

  async createProfessional(dto: UpsertProfessionalDto) {
    await this.requireBranch(dto.branchId);
    const serviceIds = [...new Set(dto.serviceIds)];
    await this.validateServices(dto.branchId, serviceIds);
    const id = await this.prisma.$transaction(async (transaction) => {
      const professional = await transaction.professional.create({
        data: {
          branchId: dto.branchId,
          slug: await this.availableProfessionalSlug(
            transaction,
            dto.branchId,
            dto.name,
          ),
          name: dto.name.trim(),
          title: dto.title.trim(),
          bio: dto.bio?.trim() || null,
          photoUrl: dto.photoUrl?.trim() || null,
          isActive: dto.isActive,
          isOnlineBookable: dto.isActive && dto.isOnlineBookable,
          sortOrder: dto.sortOrder,
          services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
        },
      });
      await this.audit.write(transaction, {
        branchId: dto.branchId,
        entityType: 'PROFESSIONAL',
        entityId: professional.id,
        action: 'PROFESSIONAL_CREATED',
        actorType: AuditActorType.ADMIN,
        afterData: this.professionalSnapshot(professional, serviceIds),
      });
      return professional.id;
    });
    return this.findProfessional(id);
  }

  async updateProfessional(id: string, dto: UpsertProfessionalDto) {
    const existing = await this.prisma.professional.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!existing) throw new NotFoundException('Uzman bulunamadı.');
    if (existing.branchId !== dto.branchId) {
      throw new BadRequestException('Uzman başka bir salona taşınamaz.');
    }
    const serviceIds = [...new Set(dto.serviceIds)];
    await this.validateServices(dto.branchId, serviceIds);
    if (existing.isActive && !dto.isActive) {
      const futureCount = await this.prisma.booking.count({
        where: {
          professionalId: id,
          status: { in: ACTIVE_BOOKINGS },
          startAt: { gt: new Date() },
        },
      });
      if (futureCount) {
        throw new ConflictException({
          message:
            'Uzmanın gelecekte aktif randevuları bulunuyor. Önce bu randevuları taşıyın veya iptal edin.',
          conflictCount: futureCount,
        });
      }
    }
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.professional.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          title: dto.title.trim(),
          bio: dto.bio?.trim() || null,
          photoUrl: dto.photoUrl?.trim() || null,
          isActive: dto.isActive,
          isOnlineBookable: dto.isActive && dto.isOnlineBookable,
          sortOrder: dto.sortOrder,
        },
      });
      await transaction.professionalService.deleteMany({
        where: {
          professionalId: id,
          serviceId: { notIn: serviceIds },
        },
      });
      const previousIds = new Set(
        existing.services.map((item) => item.serviceId),
      );
      await transaction.professionalService.createMany({
        data: serviceIds
          .filter((serviceId) => !previousIds.has(serviceId))
          .map((serviceId) => ({ professionalId: id, serviceId })),
        skipDuplicates: true,
      });
      await this.audit.write(transaction, {
        branchId: dto.branchId,
        entityType: 'PROFESSIONAL',
        entityId: id,
        action: 'PROFESSIONAL_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: this.professionalSnapshot(
          existing,
          existing.services.map((item) => item.serviceId),
        ),
        afterData: this.professionalSnapshot(updated, serviceIds),
      });
    });
    return this.findProfessional(id);
  }

  async listProfessionalServices(professionalId: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      include: {
        branch: { select: { id: true, name: true } },
        services: true,
      },
    });
    if (!professional) throw new NotFoundException('Uzman bulunamadı.');
    const services = await this.prisma.service.findMany({
      where: { branchId: professional.branchId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const configured = new Map(
      professional.services.map((relation) => [relation.serviceId, relation]),
    );
    return {
      professional: {
        id: professional.id,
        name: professional.name,
        title: professional.title,
      },
      services: services.map((service) => {
        const relation = configured.get(service.id);
        return {
          serviceId: service.id,
          serviceName: service.name,
          category: service.category,
          isServiceActive: service.isActive,
          salonDurationMinutes: service.durationMinutes,
          salonPriceKurus: service.priceKurus,
          salonOnlineBookable: service.isOnlineBookable,
          isAssigned: Boolean(relation),
          durationMinutesOverride: relation?.durationMinutesOverride ?? null,
          priceKurusOverride: relation?.priceKurusOverride ?? null,
          isOnlineBookableOverride: relation?.isOnlineBookableOverride ?? null,
          bufferBeforeMinutes: relation?.bufferBeforeMinutes ?? 0,
          bufferAfterMinutes: relation?.bufferAfterMinutes ?? 0,
          processingStartOffsetMinutes:
            relation?.processingStartOffsetMinutes ?? null,
          processingDurationMinutes: relation?.processingDurationMinutes ?? 0,
          effectiveDurationMinutes:
            relation?.durationMinutesOverride ?? service.durationMinutes,
          effectivePriceKurus:
            relation?.priceKurusOverride ?? service.priceKurus,
          effectiveOnlineBookable:
            service.isActive &&
            service.isOnlineBookable &&
            professional.isActive &&
            professional.isOnlineBookable &&
            Boolean(relation) &&
            relation?.isOnlineBookableOverride !== false,
        };
      }),
    };
  }

  async updateProfessionalService(
    professionalId: string,
    serviceId: string,
    dto: UpdateProfessionalServiceDto,
  ) {
    const [professional, service, existing] = await Promise.all([
      this.prisma.professional.findUnique({
        where: { id: professionalId },
      }),
      this.prisma.service.findUnique({ where: { id: serviceId } }),
      this.prisma.professionalService.findUnique({
        where: { professionalId_serviceId: { professionalId, serviceId } },
      }),
    ]);
    if (!professional) throw new NotFoundException('Uzman bulunamadı.');
    if (!service || service.branchId !== professional.branchId) {
      throw new NotFoundException('Hizmet bulunamadı.');
    }
    this.validateProfessionalService(dto, service.durationMinutes);

    await this.prisma.$transaction(async (transaction) => {
      if (!dto.isAssigned) {
        await transaction.professionalService.deleteMany({
          where: { professionalId, serviceId },
        });
      } else {
        await transaction.professionalService.upsert({
          where: { professionalId_serviceId: { professionalId, serviceId } },
          update: {
            durationMinutesOverride: dto.durationMinutesOverride ?? null,
            priceKurusOverride: dto.priceKurusOverride ?? null,
            isOnlineBookableOverride: dto.isOnlineBookableOverride ?? null,
            bufferBeforeMinutes: dto.bufferBeforeMinutes,
            bufferAfterMinutes: dto.bufferAfterMinutes,
            processingStartOffsetMinutes:
              dto.processingStartOffsetMinutes ?? null,
            processingDurationMinutes: dto.processingDurationMinutes,
          },
          create: {
            professionalId,
            serviceId,
            durationMinutesOverride: dto.durationMinutesOverride ?? null,
            priceKurusOverride: dto.priceKurusOverride ?? null,
            isOnlineBookableOverride: dto.isOnlineBookableOverride ?? null,
            bufferBeforeMinutes: dto.bufferBeforeMinutes,
            bufferAfterMinutes: dto.bufferAfterMinutes,
            processingStartOffsetMinutes:
              dto.processingStartOffsetMinutes ?? null,
            processingDurationMinutes: dto.processingDurationMinutes,
          },
        });
      }
      await this.audit.write(transaction, {
        branchId: professional.branchId,
        entityType: 'PROFESSIONAL_SERVICE',
        entityId: `${professionalId}:${serviceId}`,
        action: dto.isAssigned
          ? 'PROFESSIONAL_SERVICE_UPDATED'
          : 'PROFESSIONAL_SERVICE_REMOVED',
        actorType: AuditActorType.ADMIN,
        beforeData: existing
          ? {
              durationMinutesOverride: existing.durationMinutesOverride,
              priceKurusOverride: existing.priceKurusOverride,
              isOnlineBookableOverride: existing.isOnlineBookableOverride,
              bufferBeforeMinutes: existing.bufferBeforeMinutes,
              bufferAfterMinutes: existing.bufferAfterMinutes,
              processingStartOffsetMinutes:
                existing.processingStartOffsetMinutes,
              processingDurationMinutes: existing.processingDurationMinutes,
            }
          : { assigned: false },
        afterData: dto.isAssigned
          ? {
              durationMinutesOverride: dto.durationMinutesOverride ?? null,
              priceKurusOverride: dto.priceKurusOverride ?? null,
              isOnlineBookableOverride: dto.isOnlineBookableOverride ?? null,
              bufferBeforeMinutes: dto.bufferBeforeMinutes,
              bufferAfterMinutes: dto.bufferAfterMinutes,
              processingStartOffsetMinutes:
                dto.processingStartOffsetMinutes ?? null,
              processingDurationMinutes: dto.processingDurationMinutes,
            }
          : { assigned: false },
      });
    });
    return this.listProfessionalServices(professionalId);
  }

  private validateService(dto: UpsertServiceDto) {
    if (dto.durationMinutes % 5 !== 0) {
      throw new BadRequestException(
        'Hizmet süresi 5 dakikanın katı olmalıdır.',
      );
    }
  }

  private validateProfessionalService(
    dto: UpdateProfessionalServiceDto,
    salonDurationMinutes: number,
  ) {
    if (!dto.isAssigned) return;
    const duration = dto.durationMinutesOverride ?? salonDurationMinutes;
    if (
      dto.processingStartOffsetMinutes == null &&
      dto.processingDurationMinutes > 0
    ) {
      throw new BadRequestException(
        'Bekleme aşaması için başlangıç dakikası seçilmelidir.',
      );
    }
    if (
      dto.processingStartOffsetMinutes != null &&
      dto.processingStartOffsetMinutes + dto.processingDurationMinutes >
        duration
    ) {
      throw new BadRequestException(
        'Bekleme aşaması hizmet süresinin dışına taşamaz.',
      );
    }
  }

  private async validateProfessionals(branchId: string, ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.professional.count({
      where: { id: { in: ids }, branchId },
    });
    if (count !== ids.length)
      throw new BadRequestException('Uzman seçimi geçerli değil.');
  }

  private async validateServices(branchId: string, ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.service.count({
      where: { id: { in: ids }, branchId, isActive: true },
    });
    if (count !== ids.length)
      throw new BadRequestException('Hizmet seçimi geçerli değil.');
  }

  private async availableServiceSlug(
    transaction: Prisma.TransactionClient,
    branchId: string,
    name: string,
  ) {
    return this.availableSlug(slugifyTurkish(name) || 'hizmet', (slug) =>
      transaction.service.count({ where: { branchId, slug } }),
    );
  }

  private async availableProfessionalSlug(
    transaction: Prisma.TransactionClient,
    branchId: string,
    name: string,
  ) {
    return this.availableSlug(slugifyTurkish(name) || 'uzman', (slug) =>
      transaction.professional.count({ where: { branchId, slug } }),
    );
  }

  private async availableSlug(
    base: string,
    count: (slug: string) => Promise<number>,
  ) {
    if (!(await count(base))) return base;
    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const candidate = `${base}-${suffix}`;
      if (!(await count(candidate))) return candidate;
    }
    throw new ConflictException('Benzersiz bir kısa ad üretilemedi.');
  }

  private serviceSnapshot(
    service: {
      name: string;
      category: string;
      durationMinutes: number;
      priceKurus: number;
      isActive: boolean;
      isOnlineBookable: boolean;
      sortOrder: number;
    },
    professionalIds: string[],
  ) {
    return {
      name: service.name,
      category: service.category,
      durationMinutes: service.durationMinutes,
      priceKurus: service.priceKurus,
      isActive: service.isActive,
      isOnlineBookable: service.isOnlineBookable,
      sortOrder: service.sortOrder,
      professionalIds,
    };
  }

  private professionalSnapshot(
    professional: {
      name: string;
      title: string;
      isActive: boolean;
      isOnlineBookable: boolean;
      sortOrder: number;
    },
    serviceIds: string[],
  ) {
    return {
      name: professional.name,
      title: professional.title,
      isActive: professional.isActive,
      isOnlineBookable: professional.isOnlineBookable,
      sortOrder: professional.sortOrder,
      serviceIds,
    };
  }

  private async findService(id: string) {
    const item = await this.prisma.service.findUnique({
      where: { id },
      include: { professionals: true },
    });
    if (!item) throw new NotFoundException('Hizmet bulunamadı.');
    return {
      ...item,
      professionalIds: item.professionals.map(
        (relation) => relation.professionalId,
      ),
    };
  }

  private async findProfessional(id: string) {
    const item = await this.prisma.professional.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!item) throw new NotFoundException('Uzman bulunamadı.');
    return {
      ...item,
      serviceIds: item.services.map((relation) => relation.serviceId),
    };
  }

  private async requireBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');
    return branch;
  }
}
