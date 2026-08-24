/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const makeService = () => {
    const prisma = {
      $transaction: jest.fn(),
      customer: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
    );
    const audit = { write: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    return {
      prisma,
      service: new CustomersService(
        prisma as unknown as PrismaService,
        audit as unknown as OperationsAuditService,
      ),
      audit,
    };
  };

  it('does not turn a name-only query into an empty phone contains filter', async () => {
    const { prisma, service } = makeService();

    await service.search('branch-1', { query: 'Eray', take: 20 });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bookings: { some: { branchId: 'branch-1' } },
          OR: [{ fullName: { contains: 'Eray', mode: 'insensitive' } }],
        }),
      }),
    );
  });

  it('adds a partial phone filter only when the query contains enough digits', async () => {
    const { prisma, service } = makeService();

    await service.search('branch-1', { query: '539', take: 20 });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bookings: { some: { branchId: 'branch-1' } },
          OR: [
            { fullName: { contains: '539', mode: 'insensitive' } },
            { phone: { contains: '539' } },
          ],
        }),
      }),
    );
  });

  it('requires a meaningful reason before restricting online booking', async () => {
    const { prisma, service } = makeService();
    prisma.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      onlineBookingBlockedAt: null,
    });

    await expect(
      service.updateOnlineBookingAccess('branch-1', 'admin-1', 'customer-1', {
        blocked: true,
        reason: ' ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('restricts online booking and records an auditable reason', async () => {
    const { prisma, service, audit } = makeService();
    prisma.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      onlineBookingBlockedAt: null,
    });
    prisma.customer.update.mockResolvedValue({
      id: 'customer-1',
      onlineBookingBlockedAt: new Date('2026-07-27T09:00:00.000Z'),
      onlineBookingBlockReason: 'Tekrarlanan gelmeme',
    });

    const result = await service.updateOnlineBookingAccess(
      'branch-1',
      'admin-1',
      'customer-1',
      { blocked: true, reason: '  Tekrarlanan gelmeme  ' },
    );

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onlineBookingBlockReason: 'Tekrarlanan gelmeme',
          onlineBookingBlockedByAdminUserId: 'admin-1',
        }),
      }),
    );
    expect(audit.write).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'ONLINE_BOOKING_BLOCKED',
        reason: 'Tekrarlanan gelmeme',
      }),
    );
    expect(result.onlineBookingBlockReason).toBe('Tekrarlanan gelmeme');
  });
});
