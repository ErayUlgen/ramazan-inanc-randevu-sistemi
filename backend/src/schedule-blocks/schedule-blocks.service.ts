import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingStatus,
  Prisma,
  ScheduleBlockKind,
} from '@prisma/client';
import {
  branchDayBounds,
  minuteOfDay,
  toBranchDateTime,
} from '../common/branch-time';
import { lockBranchSchedule } from '../common/schedule-lock';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelScheduleBlockDto } from './dto/cancel-schedule-block.dto';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.HOLD,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.CONFIRMED,
];

const BLOCK_INCLUDE = {
  professional: {
    select: { id: true, slug: true, name: true, title: true },
  },
} satisfies Prisma.ScheduleBlockInclude;

type BlockRecord = Prisma.ScheduleBlockGetPayload<{
  include: typeof BLOCK_INCLUDE;
}>;

@Injectable()
export class ScheduleBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hours: BusinessHoursService,
    private readonly audit: OperationsAuditService,
  ) {}

  async list(branchId: string, date: string) {
    await this.requireBranch(branchId);
    const { start, end } = branchDayBounds(date);
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: {
        branchId,
        cancelledAt: null,
        startAt: { lt: end },
        endAt: { gt: start },
      },
      include: BLOCK_INCLUDE,
      orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
    });
    return blocks.map((block) => this.toDto(block));
  }

  async create(dto: CreateScheduleBlockDto) {
    const branch = await this.requireBranch(dto.branchId);
    const { startAt, endAt } = await this.validateInput(dto, branch.id);
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, branch.id);
      await this.assertNoConflicts(
        transaction,
        branch.id,
        dto.professionalId,
        startAt,
        endAt,
      );
      const block = await transaction.scheduleBlock.create({
        data: {
          branchId: branch.id,
          professionalId: dto.professionalId ?? null,
          kind: dto.kind,
          title: dto.title.trim(),
          internalNote: dto.internalNote?.trim() || null,
          startAt,
          endAt,
        },
        include: BLOCK_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId: branch.id,
        entityType: 'SCHEDULE_BLOCK',
        entityId: block.id,
        action: 'SCHEDULE_BLOCK_CREATED',
        actorType: AuditActorType.ADMIN,
        afterData: this.auditSnapshot(block),
      });
      return this.toDto(block);
    });
  }

  async update(id: string, dto: UpdateScheduleBlockDto) {
    const existing = await this.prisma.scheduleBlock.findUnique({
      where: { id },
      include: BLOCK_INCLUDE,
    });
    if (!existing || existing.cancelledAt) {
      throw new NotFoundException('Zaman bloğu bulunamadı.');
    }
    if (dto.branchId !== existing.branchId) {
      throw new BadRequestException('Zaman bloğu başka bir salona taşınamaz.');
    }
    const { startAt, endAt } = await this.validateInput(dto, existing.branchId);
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, existing.branchId);
      const fresh = await transaction.scheduleBlock.findUnique({
        where: { id },
      });
      if (
        !fresh ||
        fresh.cancelledAt ||
        fresh.updatedAt.getTime() !== existing.updatedAt.getTime()
      ) {
        throw new ConflictException(
          'Zaman bloğu başka bir işlemde güncellendi. Veriyi yenileyin.',
        );
      }
      await this.assertNoConflicts(
        transaction,
        existing.branchId,
        dto.professionalId,
        startAt,
        endAt,
        id,
      );
      const updated = await transaction.scheduleBlock.update({
        where: { id },
        data: {
          professionalId: dto.professionalId ?? null,
          kind: dto.kind,
          title: dto.title.trim(),
          internalNote: dto.internalNote?.trim() || null,
          startAt,
          endAt,
        },
        include: BLOCK_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId: existing.branchId,
        entityType: 'SCHEDULE_BLOCK',
        entityId: id,
        action: 'SCHEDULE_BLOCK_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: this.auditSnapshot(existing),
        afterData: this.auditSnapshot(updated),
      });
      return this.toDto(updated);
    });
  }

  async cancel(id: string, dto: CancelScheduleBlockDto) {
    const existing = await this.prisma.scheduleBlock.findUnique({
      where: { id },
      include: BLOCK_INCLUDE,
    });
    if (!existing || existing.cancelledAt) {
      throw new NotFoundException('Zaman bloğu bulunamadı.');
    }
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, existing.branchId);
      const result = await transaction.scheduleBlock.updateMany({
        where: { id, cancelledAt: null },
        data: {
          cancelledAt: new Date(),
          cancellationReason: dto.reason.trim(),
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Zaman bloğu başka bir işlemde güncellendi. Veriyi yenileyin.',
        );
      }
      await this.audit.write(transaction, {
        branchId: existing.branchId,
        entityType: 'SCHEDULE_BLOCK',
        entityId: id,
        action: 'SCHEDULE_BLOCK_CANCELLED',
        actorType: AuditActorType.ADMIN,
        beforeData: this.auditSnapshot(existing),
        reason: dto.reason.trim(),
      });
      await transaction.slotRecoveryEvent.create({
        data: {
          branchId: existing.branchId,
          startAt: existing.startAt,
          endAt: existing.endAt,
          professionalId: existing.professionalId,
          sourceType: 'SCHEDULE_BLOCK_CANCELLATION',
          sourceId: id,
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId: existing.branchId,
          resourceType: 'SCHEDULE_BLOCK',
          resourceId: id,
          action: 'SCHEDULE_BLOCK_CANCELLED',
        },
      });
      return { cancelled: true };
    });
  }

  private async validateInput(dto: CreateScheduleBlockDto, branchId: string) {
    const isBranchBlock = dto.kind === ScheduleBlockKind.BRANCH_BLOCK;
    if (isBranchBlock !== !dto.professionalId) {
      throw new BadRequestException(
        isBranchBlock
          ? 'Salon bloğunda uzman seçilmemelidir.'
          : 'Bu blok türü için bir uzman seçin.',
      );
    }
    if (dto.professionalId) {
      const professional = await this.prisma.professional.findFirst({
        where: { id: dto.professionalId, branchId, isActive: true },
      });
      if (!professional) throw new BadRequestException('Uzman geçerli değil.');
    }
    const startAt = toBranchDateTime(dto.date, dto.startTime);
    const endAt = toBranchDateTime(dto.date, dto.endTime);
    if (startAt >= endAt) {
      throw new BadRequestException(
        'Blok başlangıcı bitişinden önce olmalıdır.',
      );
    }
    const intervals = await this.hours.resolveEffectiveIntervals(
      branchId,
      dto.date,
    );
    const startMinute = minuteOfDay(startAt);
    const endMinute = minuteOfDay(endAt);
    if (
      !intervals.some(
        (interval) =>
          startMinute >= interval.startMinute &&
          endMinute <= interval.endMinute,
      )
    ) {
      throw new BadRequestException(
        'Zaman bloğu salonun çalışma aralıklarından birinin içinde olmalıdır.',
      );
    }
    return { startAt, endAt };
  }

  private async assertNoConflicts(
    transaction: Prisma.TransactionClient,
    branchId: string,
    professionalId: string | undefined,
    startAt: Date,
    endAt: Date,
    excludeBlockId?: string,
  ) {
    const bookings = await transaction.booking.findMany({
      where: {
        branchId,
        ...(professionalId ? { professionalId } : {}),
        status: { in: ACTIVE_BOOKING_STATUSES },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, publicCode: true, startAt: true },
      take: 10,
    });
    if (bookings.length) {
      throw new ConflictException({
        message:
          'Bu zaman bloğu mevcut randevularla çakışıyor. Önce randevuları taşıyın veya iptal edin.',
        conflictCount: bookings.length,
        conflicts: bookings.map((booking) => ({
          id: booking.id,
          publicCode: booking.publicCode,
          startAt: booking.startAt.toISOString(),
        })),
      });
    }
    const blocks = await transaction.scheduleBlock.count({
      where: {
        branchId,
        id: excludeBlockId ? { not: excludeBlockId } : undefined,
        cancelledAt: null,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(professionalId
          ? {
              OR: [
                { professionalId },
                { professionalId: null, kind: ScheduleBlockKind.BRANCH_BLOCK },
              ],
            }
          : {}),
      },
    });
    if (blocks) {
      throw new ConflictException(
        'Bu zaman aralığında başka bir aktif zaman bloğu bulunuyor.',
      );
    }
  }

  private auditSnapshot(block: BlockRecord) {
    return {
      professionalId: block.professionalId,
      professionalName: block.professional?.name ?? null,
      kind: block.kind,
      title: block.title,
      startAt: block.startAt.toISOString(),
      endAt: block.endAt.toISOString(),
    };
  }

  private toDto(block: BlockRecord) {
    return {
      id: block.id,
      branchId: block.branchId,
      professionalId: block.professionalId,
      professional: block.professional,
      kind: block.kind,
      title: block.title,
      internalNote: block.internalNote,
      startAt: block.startAt.toISOString(),
      endAt: block.endAt.toISOString(),
      cancelledAt: block.cancelledAt?.toISOString() ?? null,
      cancellationReason: block.cancellationReason,
      createdAt: block.createdAt.toISOString(),
      updatedAt: block.updatedAt.toISOString(),
    };
  }

  private async requireBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');
    return branch;
  }
}
