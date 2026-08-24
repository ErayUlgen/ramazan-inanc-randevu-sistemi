import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminRole, AuditActorType } from '@prisma/client';
import * as argon2 from 'argon2';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamAccessDto } from './dto/create-team-access.dto';
import {
  ResetTeamPasswordDto,
  UpdateTeamAccessDto,
} from './dto/update-team-access.dto';

@Injectable()
export class TeamAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  async list(branchId: string) {
    const users = await this.prisma.adminUser.findMany({
      where: { branchId },
      include: {
        professional: { select: { id: true, name: true, title: true } },
        _count: {
          select: {
            sessions: {
              where: { revokedAt: null, expiresAt: { gt: new Date() } },
            },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
    });
    return users.map((user) => this.toDto(user));
  }

  async create(
    branchId: string,
    actorUserId: string,
    dto: CreateTeamAccessDto,
  ) {
    const professionalId = await this.validateRoleLink(
      branchId,
      dto.role,
      dto.professionalId,
    );
    const username = dto.username.trim().toLocaleLowerCase('tr-TR');
    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.adminUser.create({
          data: {
            branchId,
            username,
            displayName: dto.displayName.trim(),
            passwordHash: await argon2.hash(dto.password, {
              type: argon2.argon2id,
            }),
            role: dto.role,
            professionalId,
          },
        });
        await this.audit.write(transaction, {
          branchId,
          entityType: 'ADMIN_USER',
          entityId: created.id,
          action: 'TEAM_ACCESS_CREATED',
          actorType: AuditActorType.ADMIN,
          afterData: {
            actorUserId,
            username,
            displayName: created.displayName,
            role: created.role,
            professionalId,
          },
        });
        return created;
      });
      return this.find(branchId, user.id);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('Unique constraint') ||
          error.message.includes('admin_users_branch_id_username_key'))
      ) {
        throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
      }
      throw error;
    }
  }

  async update(
    branchId: string,
    actorUserId: string,
    id: string,
    dto: UpdateTeamAccessDto,
  ) {
    const current = await this.require(branchId, id);
    const role = dto.role ?? current.role;
    const professionalId = await this.validateRoleLink(
      branchId,
      role,
      dto.professionalId === undefined
        ? current.professionalId
        : dto.professionalId,
    );
    if (id === actorUserId && dto.isActive === false) {
      throw new BadRequestException('Kendi hesabınızı pasif yapamazsınız.');
    }
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.adminUser.update({
        where: { id },
        data: {
          displayName: dto.displayName?.trim() ?? current.displayName,
          role,
          professionalId,
          isActive: dto.isActive ?? current.isActive,
        },
      });
      if (
        current.role !== updated.role ||
        current.professionalId !== updated.professionalId ||
        current.isActive !== updated.isActive
      ) {
        await transaction.adminSession.updateMany({
          where: { adminUserId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.audit.write(transaction, {
        branchId,
        entityType: 'ADMIN_USER',
        entityId: id,
        action: 'TEAM_ACCESS_UPDATED',
        actorType: AuditActorType.ADMIN,
        beforeData: {
          displayName: current.displayName,
          role: current.role,
          professionalId: current.professionalId,
          isActive: current.isActive,
        },
        afterData: {
          actorUserId,
          displayName: updated.displayName,
          role: updated.role,
          professionalId: updated.professionalId,
          isActive: updated.isActive,
        },
      });
    });
    return this.find(branchId, id);
  }

  async resetPassword(
    branchId: string,
    actorUserId: string,
    id: string,
    dto: ResetTeamPasswordDto,
  ) {
    await this.require(branchId, id);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.adminUser.update({
        where: { id },
        data: {
          passwordHash: await argon2.hash(dto.password, {
            type: argon2.argon2id,
          }),
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await transaction.adminSession.updateMany({
        where: { adminUserId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'ADMIN_USER',
        entityId: id,
        action: 'TEAM_ACCESS_PASSWORD_RESET',
        actorType: AuditActorType.ADMIN,
        afterData: { actorUserId, sessionsRevoked: true },
      });
    });
    return { reset: true };
  }

  async revokeSessions(branchId: string, actorUserId: string, id: string) {
    await this.require(branchId, id);
    const result = await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.adminSession.updateMany({
        where: { adminUserId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'ADMIN_USER',
        entityId: id,
        action: 'TEAM_ACCESS_SESSIONS_REVOKED',
        actorType: AuditActorType.ADMIN,
        afterData: { actorUserId, revokedCount: revoked.count },
      });
      return revoked.count;
    });
    return { revoked: true, count: result };
  }

  private async validateRoleLink(
    branchId: string,
    role: AdminRole,
    professionalId?: string | null,
  ) {
    if (role === AdminRole.PROFESSIONAL && !professionalId) {
      throw new BadRequestException(
        'Uzman rolü için bağlı uzman seçilmelidir.',
      );
    }
    if (!professionalId) return null;
    const professional = await this.prisma.professional.findFirst({
      where: { id: professionalId, branchId, isActive: true },
      select: { id: true },
    });
    if (!professional) {
      throw new BadRequestException('Bağlı uzman seçimi geçerli değil.');
    }
    return professional.id;
  }

  private require(branchId: string, id: string) {
    return this.prisma.adminUser
      .findFirst({ where: { id, branchId } })
      .then((user) => {
        if (!user) throw new NotFoundException('Personel hesabı bulunamadı.');
        return user;
      });
  }

  private async find(branchId: string, id: string) {
    const user = await this.prisma.adminUser.findFirst({
      where: { id, branchId },
      include: {
        professional: { select: { id: true, name: true, title: true } },
        _count: {
          select: {
            sessions: {
              where: { revokedAt: null, expiresAt: { gt: new Date() } },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Personel hesabı bulunamadı.');
    return this.toDto(user);
  }

  private toDto(user: {
    id: string;
    username: string;
    displayName: string;
    role: AdminRole;
    professionalId: string | null;
    professional: { id: string; name: string; title: string } | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    passwordChangedAt: Date;
    createdAt: Date;
    _count: { sessions: number };
  }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      professionalId: user.professionalId,
      professional: user.professional,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      passwordChangedAt: user.passwordChangedAt.toISOString(),
      activeSessionCount: user._count.sessions,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
