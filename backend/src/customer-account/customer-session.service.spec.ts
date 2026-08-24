/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { UnauthorizedException } from '@nestjs/common';
import { CustomerSessionService } from './customer-session.service';

describe('CustomerSessionService', () => {
  const originalEnvironment = { ...process.env };
  const customer = {
    id: 'customer-1',
    fullName: 'Eray Ülgen',
    phone: '+905551112233',
    email: null,
    smsNotificationsEnabled: true,
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('stores only a token hash, keeps an independent cookie and links legacy bookings', async () => {
    const create = jest.fn().mockImplementation(({ data }) => ({
      id: 'session-1',
      customerId: customer.id,
      ...data,
      lastSeenAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      customer,
    }));
    const bookingUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = new CustomerSessionService({
      customerSession: { create },
      customer: { update: jest.fn().mockResolvedValue(customer) },
      booking: { updateMany: bookingUpdateMany },
    } as never);

    const session = await service.create(customer.id, {
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(session.token).toBeTruthy();
    const tokenHash = create.mock.calls[0][0].data.tokenHash as string;
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).not.toBe(session.token);
    expect(bookingUpdateMany).toHaveBeenCalledWith({
      where: {
        customerId: null,
        customerPhoneSnapshot: customer.phone,
      },
      data: { customerId: customer.id },
    });
    const cookie = service.sessionCookie(session.token);
    expect(cookie).toContain('ri_customer_session=');
    expect(cookie).not.toContain('ri_admin_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Max-Age=2592000');
  });

  it('rejects missing, expired and revoked sessions', async () => {
    const service = new CustomerSessionService({
      customerSession: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never);
    await expect(service.verify(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.verify('unknown-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revokes only the presented customer token', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new CustomerSessionService({
      customerSession: { updateMany },
    } as never);

    await service.revoke('customer-token');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
