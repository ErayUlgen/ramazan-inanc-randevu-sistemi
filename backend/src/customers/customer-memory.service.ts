import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminRole,
  AuditActorType,
  BookingStatus,
  Prisma,
  VisitStatus,
} from '@prisma/client';
import type { AdminIdentity } from '../admin/admin-session.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerServiceRecordDto,
  CreateCustomerTagDto,
  ReviseCustomerServiceRecordDto,
  UpdateCustomerCareProfileDto,
} from './dto/customer-memory.dto';

const RECORD_INCLUDE = {
  professional: { select: { id: true, name: true, title: true } },
  service: { select: { id: true, name: true } },
  booking: { select: { id: true, publicCode: true, startAt: true } },
  createdByAdminUser: { select: { id: true, displayName: true } },
  revisions: {
    include: {
      createdByAdminUser: { select: { id: true, displayName: true } },
    },
    orderBy: { revision: 'desc' as const },
  },
} satisfies Prisma.CustomerServiceRecordInclude;

@Injectable()
export class CustomerMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async getMemory(
    branchId: string,
    customerId: string,
    identity: AdminIdentity,
  ) {
    const customer = await this.requireCustomer(branchId, customerId);
    const now = new Date();
    const pastVisitWhere: Prisma.BookingWhereInput = {
      branchId,
      customerId,
      status: BookingStatus.CONFIRMED,
      endAt: { lte: now },
      visitStatus: { not: VisitStatus.NO_SHOW },
    };
    const [profile, tags, records, pastVisits, noShow, cancelled] =
      await Promise.all([
        this.prisma.customerCareProfile.findUnique({
          where: { customerId },
          include: {
            preferredProfessional: {
              select: { id: true, name: true, title: true },
            },
            preferredService: { select: { id: true, name: true } },
          },
        }),
        this.prisma.customerTagAssignment.findMany({
          where: { customerId },
          include: { tag: true },
          orderBy: { tag: { name: 'asc' } },
        }),
        this.prisma.customerServiceRecord.findMany({
          where: {
            branchId,
            customerId,
            ...(identity.role === AdminRole.PROFESSIONAL
              ? { professionalId: identity.professionalId ?? '__none__' }
              : {}),
          },
          include: RECORD_INCLUDE,
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        this.prisma.booking.aggregate({
          where: pastVisitWhere,
          _count: true,
          _sum: { totalPriceKurus: true },
          _max: { startAt: true },
        }),
        this.prisma.booking.count({
          where: { branchId, customerId, visitStatus: VisitStatus.NO_SHOW },
        }),
        this.prisma.booking.count({
          where: { branchId, customerId, status: BookingStatus.CANCELLED },
        }),
      ]);
    const lastPastVisit = await this.prisma.booking.findFirst({
      where: pastVisitWhere,
      orderBy: { endAt: 'desc' },
      include: {
        professional: { select: { id: true, name: true } },
        items: {
          select: { serviceId: true, serviceName: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
      },
      profile: profile
        ? {
            ...profile,
            communicationNote:
              identity.role === AdminRole.PROFESSIONAL
                ? null
                : profile.communicationNote,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
      tags: tags.map(({ tag }) => tag),
      summary: {
        pastVisitTotal: pastVisits._count,
        noShowTotal: noShow,
        cancelledTotal: cancelled,
        estimatedServiceValueKurus: pastVisits._sum.totalPriceKurus ?? 0,
        lastVisitAt: pastVisits._max.startAt?.toISOString() ?? null,
        lastProfessional: lastPastVisit?.professional ?? null,
        lastServices: lastPastVisit?.items ?? [],
      },
      serviceRecords: records.map((record) => this.recordDto(record)),
    };
  }

  async updateProfile(
    branchId: string,
    customerId: string,
    dto: UpdateCustomerCareProfileDto,
    identity: AdminIdentity,
  ) {
    if (identity.role === AdminRole.PROFESSIONAL) {
      throw new ForbiddenException(
        'Bakım profilini yalnız salon yönetimi düzenleyebilir.',
      );
    }
    await this.requireCustomer(branchId, customerId);
    await this.validatePreferences(
      branchId,
      dto.preferredProfessionalId,
      dto.preferredServiceId,
    );
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.customerCareProfile.findUnique({
        where: { customerId },
      });
      const profile = await transaction.customerCareProfile.upsert({
        where: { customerId },
        create: {
          branchId,
          customerId,
          ...this.profileData(dto),
        },
        update: this.profileData(dto),
        include: {
          preferredProfessional: {
            select: { id: true, name: true, title: true },
          },
          preferredService: { select: { id: true, name: true } },
        },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CUSTOMER_CARE_PROFILE',
        entityId: profile.id,
        action: existing ? 'CARE_PROFILE_UPDATED' : 'CARE_PROFILE_CREATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        beforeData: existing
          ? {
              preferredProfessionalId: existing.preferredProfessionalId,
              preferredServiceId: existing.preferredServiceId,
              hasSensitivityNote: Boolean(
                existing.customerReportedSensitivities,
              ),
            }
          : undefined,
        afterData: {
          preferredProfessionalId: profile.preferredProfessionalId,
          preferredServiceId: profile.preferredServiceId,
          hasSensitivityNote: Boolean(profile.customerReportedSensitivities),
        },
      });
      return profile;
    });
  }

  listTags(branchId: string) {
    return this.prisma.customerTag.findMany({
      where: { branchId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(
    branchId: string,
    dto: CreateCustomerTagDto,
    identity: AdminIdentity,
  ) {
    if (identity.role === AdminRole.PROFESSIONAL) {
      throw new ForbiddenException('Etiket yönetimi için yetkiniz yok.');
    }
    return this.prisma.customerTag.create({
      data: {
        branchId,
        name: dto.name.trim(),
        color: dto.color ?? '#13A879',
      },
    });
  }

  async setTags(
    branchId: string,
    customerId: string,
    tagIds: string[],
    identity: AdminIdentity,
  ) {
    if (identity.role === AdminRole.PROFESSIONAL) {
      throw new ForbiddenException('Etiket yönetimi için yetkiniz yok.');
    }
    await this.requireCustomer(branchId, customerId);
    const valid = await this.prisma.customerTag.findMany({
      where: { branchId, id: { in: [...new Set(tagIds)] }, isActive: true },
      select: { id: true },
    });
    if (valid.length !== new Set(tagIds).size) {
      throw new BadRequestException('Etiketlerden biri bu salona ait değil.');
    }
    await this.prisma.$transaction(async (transaction) => {
      await transaction.customerTagAssignment.deleteMany({
        where: { customerId },
      });
      if (valid.length) {
        await transaction.customerTagAssignment.createMany({
          data: valid.map((tag) => ({ customerId, tagId: tag.id })),
        });
      }
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CUSTOMER',
        entityId: customerId,
        action: 'CUSTOMER_TAGS_UPDATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: { tagIds: valid.map((tag) => tag.id) },
      });
    });
    return this.getMemory(branchId, customerId, identity);
  }

  async createServiceRecord(
    branchId: string,
    customerId: string,
    dto: CreateCustomerServiceRecordDto,
    identity: AdminIdentity,
  ) {
    await this.requireCustomer(branchId, customerId);
    const professionalId =
      identity.role === AdminRole.PROFESSIONAL
        ? identity.professionalId
        : dto.professionalId;
    if (!professionalId) {
      throw new BadRequestException('Hizmet kaydı için uzman seçin.');
    }
    await this.validateRecordRelations(
      branchId,
      customerId,
      dto.bookingId,
      dto.serviceId,
      professionalId,
    );
    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.customerServiceRecord.create({
        data: {
          branchId,
          customerId,
          bookingId: dto.bookingId,
          serviceId: dto.serviceId,
          professionalId,
          createdByAdminUserId: identity.userId,
          revisions: {
            create: {
              revision: 1,
              technique: clean(dto.technique),
              formulaNote: clean(dto.formulaNote),
              productNote: clean(dto.productNote),
              resultNote: clean(dto.resultNote),
              nextVisitRecommendation: clean(dto.nextVisitRecommendation),
              createdByAdminUserId: identity.userId,
            },
          },
        },
        include: RECORD_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId,
        bookingId: dto.bookingId,
        entityType: 'CUSTOMER_SERVICE_RECORD',
        entityId: record.id,
        action: 'SERVICE_RECORD_CREATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: {
          customerId,
          professionalId,
          serviceId: dto.serviceId ?? null,
          revision: 1,
        },
      });
      return this.recordDto(record);
    });
  }

  async reviseServiceRecord(
    branchId: string,
    recordId: string,
    dto: ReviseCustomerServiceRecordDto,
    identity: AdminIdentity,
  ) {
    const existing = await this.prisma.customerServiceRecord.findFirst({
      where: { id: recordId, branchId },
      include: { revisions: { orderBy: { revision: 'desc' }, take: 1 } },
    });
    if (!existing) throw new NotFoundException('Hizmet kaydı bulunamadı.');
    if (
      identity.role === AdminRole.PROFESSIONAL &&
      existing.professionalId !== identity.professionalId
    ) {
      throw new ForbiddenException('Yalnız kendi hizmet kaydınızı düzenleyin.');
    }
    const previous = existing.revisions[0];
    return this.prisma.$transaction(async (transaction) => {
      const nextRevision = existing.currentRevision + 1;
      await transaction.customerServiceRecordRevision.create({
        data: {
          serviceRecordId: existing.id,
          revision: nextRevision,
          technique: clean(dto.technique) ?? previous?.technique,
          formulaNote: clean(dto.formulaNote) ?? previous?.formulaNote,
          productNote: clean(dto.productNote) ?? previous?.productNote,
          resultNote: clean(dto.resultNote) ?? previous?.resultNote,
          nextVisitRecommendation:
            clean(dto.nextVisitRecommendation) ??
            previous?.nextVisitRecommendation,
          createdByAdminUserId: identity.userId,
        },
      });
      const updated = await transaction.customerServiceRecord.update({
        where: { id: existing.id },
        data: { currentRevision: nextRevision },
        include: RECORD_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId,
        bookingId: existing.bookingId ?? undefined,
        entityType: 'CUSTOMER_SERVICE_RECORD',
        entityId: existing.id,
        action: 'SERVICE_RECORD_REVISED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        beforeData: { revision: existing.currentRevision },
        afterData: { revision: nextRevision },
      });
      return this.recordDto(updated);
    });
  }

  async mergePreview(
    branchId: string,
    targetCustomerId: string,
    sourceCustomerId: string,
  ) {
    if (targetCustomerId === sourceCustomerId) {
      throw new BadRequestException('Aynı müşteri kaydı birleştirilemez.');
    }
    const [target, source] = await Promise.all([
      this.requireCustomer(branchId, targetCustomerId),
      this.requireCustomer(branchId, sourceCustomerId),
    ]);
    const [bookings, forms, records, tags] = await Promise.all([
      this.prisma.booking.count({
        where: { branchId, customerId: sourceCustomerId },
      }),
      this.prisma.bookingFormSubmission.count({
        where: { branchId, customerId: sourceCustomerId },
      }),
      this.prisma.customerServiceRecord.count({
        where: { branchId, customerId: sourceCustomerId },
      }),
      this.prisma.customerTagAssignment.count({
        where: { customerId: sourceCustomerId },
      }),
    ]);
    return {
      target: {
        id: target.id,
        fullName: target.fullName,
        phone: target.phone,
      },
      source: {
        id: source.id,
        fullName: source.fullName,
        phone: source.phone,
      },
      transfer: { bookings, forms, serviceRecords: records, tags },
      warning:
        'Kaynak kayıt arşivlenecek; aktif oturumları kapatılacak ve geçmişi birincil müşteriye taşınacak.',
    };
  }

  async merge(
    branchId: string,
    targetCustomerId: string,
    sourceCustomerId: string,
    identity: AdminIdentity,
  ) {
    if (identity.role !== AdminRole.OWNER) {
      throw new ForbiddenException(
        'Müşteri birleştirme yalnız işletme sahibine açıktır.',
      );
    }
    const preview = await this.mergePreview(
      branchId,
      targetCustomerId,
      sourceCustomerId,
    );
    return this.prisma.$transaction(async (transaction) => {
      const sourceProfile = await transaction.customerCareProfile.findUnique({
        where: { customerId: sourceCustomerId },
      });
      const targetProfile = await transaction.customerCareProfile.findUnique({
        where: { customerId: targetCustomerId },
      });
      if (sourceProfile && !targetProfile) {
        await transaction.customerCareProfile.update({
          where: { customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        });
      } else if (sourceProfile) {
        await transaction.customerCareProfile.delete({
          where: { customerId: sourceCustomerId },
        });
      }
      const sourceTags = await transaction.customerTagAssignment.findMany({
        where: { customerId: sourceCustomerId },
        select: { tagId: true },
      });
      if (sourceTags.length) {
        await transaction.customerTagAssignment.createMany({
          data: sourceTags.map((item) => ({
            customerId: targetCustomerId,
            tagId: item.tagId,
          })),
          skipDuplicates: true,
        });
      }
      await transaction.customerTagAssignment.deleteMany({
        where: { customerId: sourceCustomerId },
      });
      await Promise.all([
        transaction.booking.updateMany({
          where: { branchId, customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.waitlistEntry.updateMany({
          where: { branchId, customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.bookingSeries.updateMany({
          where: { branchId, customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.bookingReview.updateMany({
          where: { branchId, customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.customerServiceRecord.updateMany({
          where: { branchId, customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.bookingFormSubmission.updateMany({
          where: { branchId, customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.consentRecord.updateMany({
          where: { branchId, customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.customerAuthChallenge.updateMany({
          where: { customerId: sourceCustomerId },
          data: { customerId: targetCustomerId },
        }),
        transaction.customerSession.updateMany({
          where: { customerId: sourceCustomerId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      const mergeRecord = await transaction.customerMergeRecord.create({
        data: {
          branchId,
          sourceCustomerId,
          targetCustomerId,
          createdByAdminUserId: identity.userId,
          snapshot: preview,
        },
      });
      await transaction.customer.update({
        where: { id: sourceCustomerId },
        data: { mergedIntoId: targetCustomerId, mergedAt: new Date() },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'CUSTOMER',
        entityId: targetCustomerId,
        action: 'CUSTOMERS_MERGED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: {
          sourceCustomerId,
          targetCustomerId,
          mergeRecordId: mergeRecord.id,
          transfer: preview.transfer,
        },
      });
      return {
        merged: true,
        targetCustomerId,
        sourceCustomerId,
        mergeRecordId: mergeRecord.id,
      };
    });
  }

  private async requireCustomer(branchId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        mergedIntoId: null,
        OR: [
          { bookings: { some: { branchId } } },
          { careProfile: { branchId } },
        ],
      },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    return customer;
  }

  private async validatePreferences(
    branchId: string,
    professionalId?: string | null,
    serviceId?: string | null,
  ) {
    const [professionalCount, serviceCount] = await Promise.all([
      professionalId
        ? this.prisma.professional.count({
            where: { id: professionalId, branchId, isActive: true },
          })
        : 1,
      serviceId
        ? this.prisma.service.count({
            where: { id: serviceId, branchId, isActive: true },
          })
        : 1,
    ]);
    if (!professionalCount || !serviceCount) {
      throw new BadRequestException(
        'Tercih edilen uzman veya hizmet bu salona ait değil.',
      );
    }
  }

  private async validateRecordRelations(
    branchId: string,
    customerId: string,
    bookingId?: string,
    serviceId?: string,
    professionalId?: string,
  ) {
    const [bookingCount, serviceCount, professionalCount] = await Promise.all([
      bookingId
        ? this.prisma.booking.count({
            where: {
              id: bookingId,
              branchId,
              customerId,
              status: BookingStatus.CONFIRMED,
              endAt: { lte: new Date() },
              visitStatus: { not: VisitStatus.NO_SHOW },
            },
          })
        : 1,
      serviceId
        ? this.prisma.service.count({ where: { id: serviceId, branchId } })
        : 1,
      professionalId
        ? this.prisma.professional.count({
            where: { id: professionalId, branchId, isActive: true },
          })
        : 0,
    ]);
    if (!bookingCount) {
      throw new BadRequestException(
        'Hizmet kaydı yalnız müşterinin geçmiş onaylı randevusuna bağlanabilir.',
      );
    }
    if (!serviceCount || !professionalCount) {
      throw new BadRequestException('Hizmet veya uzman bu salona ait değil.');
    }
  }

  private profileData(dto: UpdateCustomerCareProfileDto) {
    return {
      ...(dto.preferredProfessionalId !== undefined
        ? { preferredProfessionalId: dto.preferredProfessionalId || null }
        : {}),
      ...(dto.preferredServiceId !== undefined
        ? { preferredServiceId: dto.preferredServiceId || null }
        : {}),
      ...(dto.stylePreferences !== undefined
        ? { stylePreferences: clean(dto.stylePreferences) }
        : {}),
      ...(dto.avoidProducts !== undefined
        ? { avoidProducts: clean(dto.avoidProducts) }
        : {}),
      ...(dto.customerReportedSensitivities !== undefined
        ? {
            customerReportedSensitivities: clean(
              dto.customerReportedSensitivities,
            ),
          }
        : {}),
      ...(dto.communicationNote !== undefined
        ? { communicationNote: clean(dto.communicationNote) }
        : {}),
    };
  }

  private recordDto(
    record: Prisma.CustomerServiceRecordGetPayload<{
      include: typeof RECORD_INCLUDE;
    }>,
  ) {
    return {
      ...record,
      booking: record.booking
        ? {
            ...record.booking,
            startAt: record.booking.startAt.toISOString(),
          }
        : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      revisions: record.revisions.map((revision) => ({
        ...revision,
        createdAt: revision.createdAt.toISOString(),
      })),
    };
  }
}

function clean(value?: string): string | null | undefined {
  if (value === undefined) return undefined;
  return value.trim() || null;
}
