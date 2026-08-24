import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  BookingStatus,
  NotificationChannel,
  NotificationEventType,
} from '@prisma/client';
import type { AdminIdentity } from '../admin/admin-session.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertNotificationRuleDto } from './dto/notification-rule.dto';

@Injectable()
export class NotificationRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async ensureDefault(branchId: string) {
    const count = await this.prisma.notificationRule.count({
      where: { branchId },
    });
    if (count) return;
    const branch = await this.prisma.branch.findUniqueOrThrow({
      where: { id: branchId },
    });
    await this.prisma.notificationRule.create({
      data: {
        branchId,
        eventType: NotificationEventType.BOOKING_REMINDER,
        channel: NotificationChannel.SMS,
        leadMinutes: branch.reminderLeadMinutes,
        bookingStatuses: [BookingStatus.CONFIRMED],
        isActive: true,
      },
    });
  }

  async list(branchId: string) {
    await this.ensureDefault(branchId);
    return this.prisma.notificationRule.findMany({
      where: { branchId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(
    branchId: string,
    dto: UpsertNotificationRuleDto,
    identity: AdminIdentity,
  ) {
    this.validate(dto);
    return this.prisma.$transaction(async (transaction) => {
      const rule = await transaction.notificationRule.create({
        data: {
          branchId,
          eventType: dto.eventType,
          channel: dto.channel,
          leadMinutes: dto.leadMinutes ?? null,
          messageTemplate: clean(dto.messageTemplate),
          bookingStatuses: dto.bookingStatuses,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'NOTIFICATION_RULE',
        entityId: rule.id,
        action: 'NOTIFICATION_RULE_CREATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: {
          eventType: rule.eventType,
          leadMinutes: rule.leadMinutes,
          isActive: rule.isActive,
        },
      });
      return rule;
    });
  }

  async update(
    branchId: string,
    id: string,
    dto: UpsertNotificationRuleDto,
    identity: AdminIdentity,
  ) {
    this.validate(dto);
    const existing = await this.prisma.notificationRule.findFirst({
      where: { id, branchId },
    });
    if (!existing) throw new NotFoundException('Bildirim kuralı bulunamadı.');
    return this.prisma.$transaction(async (transaction) => {
      const rule = await transaction.notificationRule.update({
        where: { id },
        data: {
          eventType: dto.eventType,
          channel: dto.channel,
          leadMinutes: dto.leadMinutes ?? null,
          messageTemplate: clean(dto.messageTemplate),
          bookingStatuses: dto.bookingStatuses,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'NOTIFICATION_RULE',
        entityId: rule.id,
        action: 'NOTIFICATION_RULE_UPDATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        beforeData: {
          eventType: existing.eventType,
          leadMinutes: existing.leadMinutes,
          isActive: existing.isActive,
        },
        afterData: {
          eventType: rule.eventType,
          leadMinutes: rule.leadMinutes,
          isActive: rule.isActive,
        },
      });
      return rule;
    });
  }

  private validate(dto: UpsertNotificationRuleDto) {
    if (
      dto.eventType === NotificationEventType.BOOKING_REMINDER &&
      dto.leadMinutes == null
    ) {
      throw new BadRequestException(
        'Hatırlatma kuralında zaman aralığı zorunludur.',
      );
    }
    if (dto.messageTemplate?.includes('{{otp}}')) {
      throw new BadRequestException(
        'OTP değeri bildirim şablonunda kullanılamaz.',
      );
    }
  }
}

function clean(value?: string | null): string | null {
  return value?.trim() || null;
}
