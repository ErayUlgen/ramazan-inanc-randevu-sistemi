import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AdminRole, AdminSession, AdminUser } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60_000;
const TOUCH_INTERVAL_MS = 5 * 60_000;

export type AdminIdentity = {
  sessionId: string;
  userId: string;
  branchId: string;
  username: string;
  displayName: string;
  role: AdminRole;
  professionalId: string | null;
  expiresAt: string;
};

type Credentials = {
  username?: string;
  password?: string;
  accessKey?: string;
};

@Injectable()
export class AdminSessionService {
  readonly cookieName = 'ri_admin_session';

  constructor(private readonly prisma: PrismaService) {}

  async create(
    credentials: Credentials,
    requestMeta: { ip?: string; userAgent?: string },
  ): Promise<{ token: string; expiresAt: string; user: AdminIdentity }> {
    const user = await this.resolveUser(credentials);
    if (!user || !user.isActive) throw this.invalidCredentials();
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ConflictException(
        'Çok fazla başarısız deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.',
      );
    }

    const password = credentials.accessKey ?? credentials.password ?? '';
    const valid = await argon2
      .verify(user.passwordHash, password)
      .catch(() => false);
    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1;
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCK_DURATION_MS)
              : null,
        },
      });
      throw this.invalidCredentials();
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    const session = await this.prisma.$transaction(async (transaction) => {
      await transaction.adminUser.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });
      return transaction.adminSession.create({
        data: {
          adminUserId: user.id,
          tokenHash: this.hash(token),
          ipHash: requestMeta.ip ? this.hashWithSecret(requestMeta.ip) : null,
          userAgentHash: requestMeta.userAgent
            ? this.hashWithSecret(requestMeta.userAgent)
            : null,
          expiresAt,
        },
      });
    });
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: this.identity(user, session),
    };
  }

  async verify(token: string | undefined): Promise<AdminIdentity> {
    if (!token) throw this.unauthorized();
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { adminUser: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.adminUser.isActive
    ) {
      throw this.unauthorized();
    }
    if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      void this.prisma.adminSession
        .update({
          where: { id: session.id },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => undefined);
    }
    return this.identity(session.adminUser, session);
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.adminSession.updateMany({
      where: { tokenHash: this.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listActive(identity: AdminIdentity) {
    const sessions = await this.prisma.adminSession.findMany({
      where: {
        adminUserId: identity.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    return sessions.map((session) => ({
      id: session.id,
      current: session.id === identity.sessionId,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    }));
  }

  async revokeSession(identity: AdminIdentity, sessionId: string) {
    const result = await this.prisma.adminSession.updateMany({
      where: {
        id: sessionId,
        adminUserId: identity.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new ConflictException('Oturum zaten kapatılmış veya bulunamadı.');
    }
    return { revoked: true };
  }

  isLegacyHeaderAllowed(accessKey: string | undefined): boolean {
    if (!accessKey || process.env.NODE_ENV === 'production') return false;
    if (process.env.ALLOW_ADMIN_API_KEY_HEADER !== 'true') return false;
    const expected = process.env.ADMIN_API_KEY;
    return Boolean(expected && this.safeValueEquals(accessKey, expected));
  }

  sessionCookie(token: string): string {
    return [
      `${this.cookieName}=${token}`,
      'Path=/api/admin',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${SESSION_DURATION_SECONDS}`,
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  clearCookie(): string {
    return [
      `${this.cookieName}=`,
      'Path=/api/admin',
      'HttpOnly',
      'SameSite=Strict',
      'Max-Age=0',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  readCookie(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    for (const part of cookieHeader.split(';')) {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex < 0) continue;
      if (part.slice(0, separatorIndex).trim() === this.cookieName) {
        return part.slice(separatorIndex + 1).trim();
      }
    }
    return undefined;
  }

  private async resolveUser(credentials: Credentials) {
    if (
      credentials.accessKey &&
      process.env.NODE_ENV !== 'production' &&
      this.safeValueEquals(
        credentials.accessKey,
        process.env.ADMIN_API_KEY ?? '',
      )
    ) {
      return this.ensureDevelopmentOwner(credentials.accessKey);
    }
    const username = credentials.username?.trim().toLocaleLowerCase('tr-TR');
    if (!username || !credentials.password) return null;
    return this.prisma.adminUser.findFirst({
      where: { username, isActive: true },
    });
  }

  private async ensureDevelopmentOwner(accessKey: string) {
    const existing = await this.prisma.adminUser.findFirst({
      where: { role: 'OWNER', isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;
    const branch = await this.prisma.branch.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!branch) throw new Error('Aktif salon bulunamadı.');
    return this.prisma.adminUser.create({
      data: {
        branchId: branch.id,
        username: 'owner',
        displayName: 'Salon Sahibi',
        passwordHash: await argon2.hash(accessKey, {
          type: argon2.argon2id,
        }),
      },
    });
  }

  private identity(
    user: AdminUser,
    session: Pick<AdminSession, 'id' | 'expiresAt'>,
  ): AdminIdentity {
    return {
      sessionId: session.id,
      userId: user.id,
      branchId: user.branchId,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      professionalId: user.professionalId,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashWithSecret(value: string): string {
    return createHash('sha256')
      .update(`${process.env.ADMIN_SESSION_SECRET ?? 'development'}:${value}`)
      .digest('hex');
  }

  private safeValueEquals(actual: string, expected: string): boolean {
    const actualHash = createHash('sha256').update(actual).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(actualHash, expectedHash);
  }

  private invalidCredentials() {
    return new UnauthorizedException(
      'Kullanıcı adı veya parola geçerli değil.',
    );
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException('Yönetici oturumu geçerli değil.');
  }
}
