/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsGatewayService } from '../notifications/sms-gateway.service';
import { BookingAccessService } from './booking-access.service';
import { BookingAccessSessionService } from './booking-access-session.service';

describe('BookingAccessService', () => {
  const previous = {
    otpSecret: process.env.BOOKING_ACCESS_OTP_SECRET,
    demoCode: process.env.BOOKING_ACCESS_DEMO_CODE,
    nodeEnv: process.env.NODE_ENV,
  };

  beforeAll(() => {
    process.env.BOOKING_ACCESS_OTP_SECRET =
      'test-booking-access-otp-secret-with-32-characters';
    process.env.BOOKING_ACCESS_DEMO_CODE = '111111';
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.BOOKING_ACCESS_OTP_SECRET = previous.otpSecret;
    process.env.BOOKING_ACCESS_DEMO_CODE = previous.demoCode;
    process.env.NODE_ENV = previous.nodeEnv;
  });

  const makeService = () => {
    const prisma = {
      bookingAccessChallenge: {
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve(data),
          ),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      booking: { findUnique: jest.fn() },
    };
    const sms = {
      isConfigured: jest.fn().mockReturnValue(true),
      isDevelopment: jest.fn().mockReturnValue(true),
      send: jest
        .fn()
        .mockResolvedValue({ accepted: true, provider: 'development' }),
    };
    const sessions = {
      create: jest.fn().mockReturnValue({
        token: 'signed',
        expiresAt: '2030-01-01T00:00:00.000Z',
      }),
    };
    return {
      service: new BookingAccessService(
        prisma as unknown as PrismaService,
        sms as unknown as SmsGatewayService,
        sessions as unknown as BookingAccessSessionService,
      ),
      prisma,
      sms,
      sessions,
    };
  };

  it('returns the same generic response and stores a hashed attempt for an unknown booking', async () => {
    const { service, prisma, sms } = makeService();
    prisma.booking.findUnique.mockResolvedValue(null);

    const response = await service.requestCode(
      { referenceCode: 'RI-UNKNOWN', phone: '0555 111 22 33' },
      '127.0.0.1',
    );

    expect(response.accepted).toBe(true);
    expect(response.message).toContain('Bilgiler eşleştiyse');
    expect(prisma.bookingAccessChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: null,
        phoneHash: expect.any(String),
        codeHash: expect.any(String),
      }),
    });
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('sends only when both the reference and normalized phone match', async () => {
    const { service, prisma, sms } = makeService();
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customer: { phone: '+905551112233' },
    });

    const response = await service.requestCode(
      { referenceCode: 'ri-test1234', phone: '0555 111 22 33' },
      '127.0.0.1',
    );

    expect(response.developmentCode).toBe('111111');
    expect(sms.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+905551112233',
        message: expect.stringContaining('111111'),
      }),
    );
  });

  it('increments the challenge attempt without creating a session for an invalid code', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.bookingAccessChallenge.findFirst.mockResolvedValue({
      id: 'challenge-1',
      bookingId: 'booking-1',
      codeHash: 'not-the-real-hash',
      attemptCount: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.bookingAccessChallenge.update.mockResolvedValue({});

    await expect(
      service.verifyCode({
        referenceCode: 'RI-TEST1234',
        phone: '0555 111 22 33',
        code: '000000',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.bookingAccessChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attemptCount: 1 } }),
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
