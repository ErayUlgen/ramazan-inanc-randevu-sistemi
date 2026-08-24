/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { UnauthorizedException } from '@nestjs/common';
import { CustomerAuthPurpose } from '@prisma/client';
import { CustomerAuthService } from './customer-auth.service';

describe('CustomerAuthService', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.CUSTOMER_AUTH_DEMO_CODE = '111111';
    process.env.CUSTOMER_AUTH_OTP_SECRET =
      'customer-auth-test-secret-with-at-least-thirty-two-characters';
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  const makeService = () => {
    const created = {
      id: 'challenge-1',
      customerId: 'customer-1',
      phoneHash: 'phone-hash',
      requestIpHash: 'ip-hash',
      codeHash: 'code-hash',
      purpose: CustomerAuthPurpose.ACCOUNT_LOGIN,
      subjectId: null,
      expiresAt: new Date(Date.now() + 300_000),
      consumedAt: null,
      attemptCount: 0,
      createdAt: new Date(),
    };
    const prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'customer-1',
          phone: '+905551112233',
        }),
      },
      customerAuthChallenge: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({
          ...created,
          ...data,
        })),
        update: jest.fn().mockResolvedValue(created),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const sms = {
      isConfigured: jest.fn().mockReturnValue(true),
      isDevelopment: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue({
        accepted: true,
        provider: 'development',
      }),
    };
    return {
      service: new CustomerAuthService(prisma as never, sms as never),
      prisma,
      sms,
      created,
    };
  };

  it('creates a five-minute OTP challenge and exposes only the development code', async () => {
    const { service, prisma, sms } = makeService();

    const result = await service.requestAccountCode(
      '0555 111 22 33',
      '127.0.0.1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        accepted: true,
        challengeId: expect.any(String),
        expiresInSeconds: 300,
        resendAfterSeconds: 60,
        developmentCode: '111111',
      }),
    );
    expect(prisma.customerAuthChallenge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purpose: CustomerAuthPurpose.ACCOUNT_LOGIN,
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(sms.send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'OTP' }),
    );
  });

  it('does not send a second code inside the 60-second resend window', async () => {
    const { service, prisma, sms, created } = makeService();
    prisma.customerAuthChallenge.findFirst.mockResolvedValue(created);

    const result = await service.requestAccountCode(
      '0555 111 22 33',
      '127.0.0.1',
    );

    expect(result.challengeId).toBe(created.id);
    expect(prisma.customerAuthChallenge.create).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('returns a generic response without sending when the rate limit is reached', async () => {
    const { service, prisma, sms } = makeService();
    prisma.customerAuthChallenge.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);

    const result = await service.requestAccountCode(
      '0555 111 22 33',
      '127.0.0.1',
    );

    expect(result.accepted).toBe(true);
    expect(prisma.customerAuthChallenge.create).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('rejects an expired or exhausted challenge without revealing why', async () => {
    const { service, prisma, created } = makeService();
    prisma.customerAuthChallenge.findFirst.mockResolvedValue({
      ...created,
      expiresAt: new Date(Date.now() - 1),
      attemptCount: 5,
    });

    await expect(
      service.verifyAccountCode({
        phone: '0555 111 22 33',
        challengeId: created.id,
        code: '111111',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
