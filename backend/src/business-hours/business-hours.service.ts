import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditActorType, BookingStatus, Prisma } from '@prisma/client';
import {
  assertDateKey,
  branchDayBounds,
  dateKeyFromDbDate,
  minuteOfDay,
  toDateKey,
  weekdayForDate,
} from '../common/branch-time';
import { lockBranchSchedule } from '../common/schedule-lock';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BusinessIntervalDto,
  UpdateBusinessHoursDto,
} from './dto/update-business-hours.dto';
import { UpsertDateOverrideDto } from './dto/upsert-date-override.dto';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.HOLD,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.CONFIRMED,
];

type ScheduleReader = Pick<
  Prisma.TransactionClient,
  'branchDateOverride' | 'branchWeeklyInterval'
>;

@Injectable()
export class BusinessHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async getAdmin(branchId: string) {
    const branch = await this.requireBranch(branchId);
    const [weekly, overrides] = await Promise.all([
      this.prisma.branchWeeklyInterval.findMany({
        where: { branchId },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      }),
      this.prisma.branchDateOverride.findMany({
        where: { branchId, date: { gte: new Date() } },
        include: { intervals: { orderBy: { startMinute: 'asc' } } },
        orderBy: { date: 'asc' },
        take: 120,
      }),
    ]);
    return {
      branch: { id: branch.id, name: branch.name, timezone: branch.timezone },
      days: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        intervals: weekly
          .filter((interval) => interval.weekday === weekday)
          .map(this.toInterval),
      })),
      overrides: overrides.map((override) => ({
        id: override.id,
        date: dateKeyFromDbDate(override.date),
        isClosed: override.isClosed,
        note: override.note,
        intervals: override.intervals.map(this.toInterval),
      })),
    };
  }

  async resolveEffectiveIntervals(
    branchId: string,
    date: string,
    reader: ScheduleReader = this.prisma,
  ): Promise<Array<{ startMinute: number; endMinute: number }>> {
    assertDateKey(date);
    const dbDate = new Date(`${date}T00:00:00.000Z`);
    const override = await reader.branchDateOverride.findUnique({
      where: { branchId_date: { branchId, date: dbDate } },
      include: { intervals: { orderBy: { startMinute: 'asc' } } },
    });
    if (override) {
      if (override.isClosed) return [];
      return override.intervals.map(this.toInterval);
    }
    const weekly = await reader.branchWeeklyInterval.findMany({
      where: { branchId, weekday: weekdayForDate(date) },
      orderBy: { startMinute: 'asc' },
    });
    return weekly.map(this.toInterval);
  }

  async updateWeekly(branchId: string, dto: UpdateBusinessHoursDto) {
    await this.requireBranch(branchId);
    const normalized = this.normalizeWeek(dto);
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, branchId);
      const before = await transaction.branchWeeklyInterval.findMany({
        where: { branchId },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      });
      const conflicts = await transaction.booking.findMany({
        where: {
          branchId,
          status: { in: ACTIVE_STATUSES },
          startAt: { gt: new Date() },
        },
        select: { id: true, publicCode: true, startAt: true, endAt: true },
        take: 50,
      });
      const affected = conflicts.filter((booking) => {
        const date = toDateKey(booking.startAt);
        const intervals = normalized.get(weekdayForDate(date)) ?? [];
        return !this.bookingFits(booking.startAt, booking.endAt, intervals);
      });
      if (affected.length) {
        throw new ConflictException({
          message:
            'Yeni çalışma saatleri gelecekteki randevuları dışarıda bırakıyor. Önce bu randevuları taşıyın veya iptal edin.',
          conflictCount: affected.length,
          conflicts: affected.slice(0, 10).map((item) => ({
            id: item.id,
            publicCode: item.publicCode,
            startAt: item.startAt.toISOString(),
          })),
        });
      }
      await transaction.branchWeeklyInterval.deleteMany({
        where: { branchId },
      });
      await transaction.branchWeeklyInterval.createMany({
        data: [...normalized.entries()].flatMap(([weekday, intervals]) =>
          intervals.map((interval) => ({ branchId, weekday, ...interval })),
        ),
      });
      const after = this.weekToJson(normalized);
      await this.audit.write(transaction, {
        branchId,
        entityType: 'BUSINESS_HOURS',
        entityId: branchId,
        action: 'WEEKLY_HOURS_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: this.weekToJson(this.groupWeek(before)),
        afterData: after,
      });
      return { days: after };
    });
  }

  async upsertOverride(
    branchId: string,
    date: string,
    dto: UpsertDateOverrideDto,
  ) {
    await this.requireBranch(branchId);
    assertDateKey(date);
    const intervals = dto.isClosed
      ? []
      : this.normalizeIntervals(dto.intervals);
    if (!dto.isClosed && !intervals.length) {
      throw new BadRequestException(
        'Açık bir özel gün için en az bir çalışma aralığı girin.',
      );
    }
    const dbDate = new Date(`${date}T00:00:00.000Z`);
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, branchId);
      const before = await transaction.branchDateOverride.findUnique({
        where: { branchId_date: { branchId, date: dbDate } },
        include: { intervals: true },
      });
      const { start, end } = branchDayBounds(date);
      const bookings = await transaction.booking.findMany({
        where: {
          branchId,
          status: { in: ACTIVE_STATUSES },
          startAt: { lt: end },
          endAt: { gt: start },
        },
        select: { id: true, publicCode: true, startAt: true, endAt: true },
      });
      const affected = bookings.filter(
        (booking) =>
          dto.isClosed ||
          !this.bookingFits(booking.startAt, booking.endAt, intervals),
      );
      if (affected.length) {
        throw new ConflictException({
          message:
            'Bu özel gün ayarı mevcut randevularla çakışıyor. Önce randevuları taşıyın veya iptal edin.',
          conflictCount: affected.length,
          conflicts: affected.slice(0, 10).map((item) => ({
            id: item.id,
            publicCode: item.publicCode,
            startAt: item.startAt.toISOString(),
          })),
        });
      }
      const override = await transaction.branchDateOverride.upsert({
        where: { branchId_date: { branchId, date: dbDate } },
        update: {
          isClosed: dto.isClosed,
          note: dto.note?.trim() || null,
          intervals: {
            deleteMany: {},
            create: intervals,
          },
        },
        create: {
          branchId,
          date: dbDate,
          isClosed: dto.isClosed,
          note: dto.note?.trim() || null,
          intervals: { create: intervals },
        },
        include: { intervals: { orderBy: { startMinute: 'asc' } } },
      });
      const after = {
        date,
        isClosed: override.isClosed,
        note: override.note,
        intervals: override.intervals.map(this.toInterval),
      };
      await this.audit.write(transaction, {
        branchId,
        entityType: 'DATE_OVERRIDE',
        entityId: override.id,
        action: before ? 'DATE_OVERRIDE_UPDATED' : 'DATE_OVERRIDE_CREATED',
        actorType: AuditActorType.ADMIN,
        beforeData: before
          ? {
              date,
              isClosed: before.isClosed,
              note: before.note,
              intervals: before.intervals.map(this.toInterval),
            }
          : undefined,
        afterData: after,
      });
      return { id: override.id, ...after };
    });
  }

  async deleteOverride(branchId: string, date: string) {
    await this.requireBranch(branchId);
    assertDateKey(date);
    const dbDate = new Date(`${date}T00:00:00.000Z`);
    return this.prisma.$transaction(async (transaction) => {
      await lockBranchSchedule(transaction, branchId);
      const existing = await transaction.branchDateOverride.findUnique({
        where: { branchId_date: { branchId, date: dbDate } },
        include: { intervals: true },
      });
      if (!existing) throw new NotFoundException('Özel gün ayarı bulunamadı.');
      const weekly = await transaction.branchWeeklyInterval.findMany({
        where: { branchId, weekday: weekdayForDate(date) },
      });
      const { start, end } = branchDayBounds(date);
      const bookings = await transaction.booking.findMany({
        where: {
          branchId,
          status: { in: ACTIVE_STATUSES },
          startAt: { lt: end },
          endAt: { gt: start },
        },
        select: { id: true, startAt: true, endAt: true },
      });
      if (
        bookings.some(
          (booking) =>
            !this.bookingFits(booking.startAt, booking.endAt, weekly),
        )
      ) {
        throw new ConflictException(
          'Özel gün kaldırılırsa bazı randevular haftalık çalışma saatlerinin dışında kalacak.',
        );
      }
      await transaction.branchDateOverride.delete({
        where: { id: existing.id },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'DATE_OVERRIDE',
        entityId: existing.id,
        action: 'DATE_OVERRIDE_REMOVED',
        actorType: AuditActorType.ADMIN,
        beforeData: {
          date,
          isClosed: existing.isClosed,
          note: existing.note,
          intervals: existing.intervals.map(this.toInterval),
        },
      });
      return { removed: true };
    });
  }

  private normalizeWeek(dto: UpdateBusinessHoursDto) {
    const weekdays = new Set(dto.days.map((day) => day.weekday));
    if (
      weekdays.size !== 7 ||
      [...weekdays].some((day) => day < 0 || day > 6)
    ) {
      throw new BadRequestException(
        'Haftanın yedi günü birer kez gönderilmelidir.',
      );
    }
    return new Map(
      dto.days.map((day) => [
        day.weekday,
        this.normalizeIntervals(day.intervals),
      ]),
    );
  }

  private normalizeIntervals(intervals: BusinessIntervalDto[]) {
    const sorted = intervals
      .map((item) => ({
        startMinute: item.startMinute,
        endMinute: item.endMinute,
      }))
      .sort((a, b) => a.startMinute - b.startMinute);
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (current.startMinute >= current.endMinute) {
        throw new BadRequestException(
          'Çalışma aralığının başlangıcı bitişinden önce olmalıdır.',
        );
      }
      if (index > 0 && sorted[index - 1].endMinute > current.startMinute) {
        throw new BadRequestException('Çalışma aralıkları çakışamaz.');
      }
    }
    return sorted;
  }

  private bookingFits(
    startAt: Date,
    endAt: Date,
    intervals: Array<{ startMinute: number; endMinute: number }>,
  ) {
    if (toDateKey(startAt) !== toDateKey(new Date(endAt.getTime() - 1))) {
      return false;
    }
    const startMinute = minuteOfDay(startAt);
    const endMinute = minuteOfDay(endAt);
    return intervals.some(
      (interval) =>
        startMinute >= interval.startMinute && endMinute <= interval.endMinute,
    );
  }

  private groupWeek(
    intervals: Array<{
      weekday: number;
      startMinute: number;
      endMinute: number;
    }>,
  ) {
    const grouped = new Map<
      number,
      Array<{ startMinute: number; endMinute: number }>
    >();
    for (let weekday = 0; weekday < 7; weekday += 1) grouped.set(weekday, []);
    for (const interval of intervals) {
      grouped.get(interval.weekday)!.push(this.toInterval(interval));
    }
    return grouped;
  }

  private weekToJson(
    week: Map<number, Array<{ startMinute: number; endMinute: number }>>,
  ) {
    return Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      intervals: week.get(weekday) ?? [],
    }));
  }

  private toInterval(
    this: void,
    item: { startMinute: number; endMinute: number },
  ) {
    return { startMinute: item.startMinute, endMinute: item.endMinute };
  }

  private async requireBranch(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');
    return branch;
  }
}
