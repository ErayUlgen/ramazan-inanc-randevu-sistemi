/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AdminSessionService } from './admin-session.service';

describe('AdminSessionService', () => {
  const originalEnvironment = { ...process.env };
  const user = {
    id: 'user-1',
    branchId: 'branch-1',
    username: 'owner',
    displayName: 'Salon Sahibi',
    role: 'OWNER' as const,
    passwordHash: '',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    process.env.ADMIN_SESSION_SECRET =
      'test-session-secret-with-more-than-thirty-two-characters';
    process.env.NODE_ENV = 'test';
    user.passwordHash = await argon2.hash('correct-password', {
      type: argon2.argon2id,
    });
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('creates a revocable database-backed session and stores only its hash', async () => {
    const create = jest.fn().mockImplementation(({ data }) => ({
      id: 'session-1',
      ...data,
      lastSeenAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const prisma = {
      adminUser: {
        findFirst: jest.fn().mockResolvedValue(user),
      },
      $transaction: jest.fn().mockImplementation(async (callback) =>
        callback({
          adminUser: { update: jest.fn().mockResolvedValue(user) },
          adminSession: { create },
        }),
      ),
    };
    const service = new AdminSessionService(prisma as never);
    const session = await service.create(
      { username: 'owner', password: 'correct-password' },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(session.token).toBeTruthy();
    expect(create).toHaveBeenCalled();
    const storedHash = create.mock.calls[0][0].data.tokenHash as string;
    expect(storedHash).toHaveLength(64);
    expect(storedHash).not.toBe(session.token);
    expect(service.sessionCookie(session.token)).toContain('HttpOnly');
    expect(service.sessionCookie(session.token)).toContain('SameSite=Strict');
  });

  it('rejects an invalid password and records the failed login', async () => {
    const update = jest.fn().mockResolvedValue(user);
    const service = new AdminSessionService({
      adminUser: {
        findFirst: jest.fn().mockResolvedValue(user),
        update,
      },
    } as never);
    await expect(
      service.create({ username: 'owner', password: 'wrong-password' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLoginCount: 1 }),
      }),
    );
  });

  it('rejects an unknown or revoked server session', async () => {
    const service = new AdminSessionService({
      adminSession: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never);
    await expect(service.verify('changed-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('always disables the legacy header in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_ADMIN_API_KEY_HEADER = 'true';
    process.env.ADMIN_API_KEY = 'test-admin-key';
    const service = new AdminSessionService({} as never);
    expect(service.isLegacyHeaderAllowed('test-admin-key')).toBe(false);
  });
});
