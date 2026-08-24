/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException } from '@nestjs/common';
import { BookingSource, BookingStatus } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from './bookings.service';
import { BookingDecision } from './dto/booking-decision.dto';

describe('BookingsService admin operations', () => {
  const booking = {
    id: 'booking-1',
    publicCode: 'RI-TEST0001',
    branchId: 'branch-1',
    professionalId: 'professional-1',
    customerId: 'customer-1',
    status: BookingStatus.PENDING_APPROVAL,
    source: BookingSource.ONLINE,
    startAt: new Date(Date.now() + 3_600_000),
    endAt: new Date(Date.now() + 7_200_000),
    totalDurationMinutes: 60,
    totalPriceKurus: 90_000,
    holdExpiresAt: null,
    holdTokenHash: null,
    customerNote: null,
    rejectionReason: null,
    cancellationReason: null,
    approvedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: {
      id: 'customer-1',
      fullName: 'Test Müşteri',
      phone: '+905551112233',
      email: null,
    },
    professional: {
      id: 'professional-1',
      slug: 'ramazan-inanc',
      name: 'Ramazan İnanç',
      title: 'Anatomik Saç Kesim Uzmanı',
    },
    items: [
      {
        id: 'item-1',
        serviceId: 'service-1',
        serviceName: 'Anatomik Saç Kesimi',
        durationMinutes: 60,
        priceKurus: 90_000,
        sortOrder: 0,
      },
    ],
  };

  const makeService = () => {
    const prisma = {
      $transaction: jest.fn(),
      branch: { findUnique: jest.fn() },
      professional: { findMany: jest.fn() },
      booking: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      scheduleBlock: { findMany: jest.fn().mockResolvedValue([]) },
      bookingNotification: { count: jest.fn().mockResolvedValue(0) },
      branchBookingPolicy: {
        findUnique: jest.fn().mockResolvedValue({
          pendingWarningMinutes: 10,
        }),
      },
      slotRecoveryEvent: { create: jest.fn().mockResolvedValue({}) },
      adminRealtimeEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
    );
    const outbox = {
      enqueue: jest.fn().mockResolvedValue({ id: 'notification-1' }),
    };
    const hours = {
      resolveEffectiveIntervals: jest
        .fn()
        .mockResolvedValue([{ startMinute: 600, endMinute: 1260 }]),
    };
    const audit = { write: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const service = new BookingsService(
      prisma as unknown as PrismaService,
      {} as AvailabilityService,
      {} as ScheduleValidationService,
      hours as unknown as BusinessHoursService,
      outbox,
      audit as unknown as OperationsAuditService,
      {} as never,
      {} as never,
    );
    return { prisma, service, outbox };
  };

  it('returns a bounded, safe booking board and expires old holds first', async () => {
    const { prisma, service } = makeService();
    prisma.branch.findUnique.mockResolvedValue({
      id: 'branch-1',
      slug: 'hair-art-ramazan-inanc-denizli',
      name: 'Ramazan İnanç Hair Art Studio',
      city: 'Denizli',
      timezone: 'Europe/Istanbul',
      openingMinute: 600,
      closingMinute: 1260,
      arrivalLeadMinutes: 15,
      reminderLeadMinutes: 120,
      isActive: true,
    });
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    prisma.professional.findMany.mockResolvedValue([
      { ...booking.professional, sortOrder: 0 },
    ]);
    prisma.booking.findMany
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce([booking]);
    prisma.booking.count.mockResolvedValue(1);

    const result = await service.getAdminBookingBoard(
      'hair-art-ramazan-inanc-denizli',
      '2030-07-22',
    );

    expect(prisma.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: BookingStatus.HOLD }),
      }),
    );
    expect(prisma.booking.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 50 }),
    );
    expect(result.pendingQueue).toHaveLength(1);
    expect(result.pendingQueue[0]).not.toHaveProperty('holdTokenHash');
    expect(result.summary.pendingTotal).toBe(1);
  });

  it('approves with a conditional status update', async () => {
    const { prisma, service, outbox } = makeService();
    prisma.booking.findUnique
      .mockResolvedValueOnce(booking)
      .mockResolvedValueOnce({ ...booking, status: BookingStatus.CONFIRMED });
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.decide('booking-1', {
      decision: BookingDecision.APPROVE,
    });

    expect(prisma.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'booking-1',
          status: BookingStatus.PENDING_APPROVAL,
        }),
      }),
    );
    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      prisma,
      'booking-1',
      'BOOKING_APPROVED',
    );
  });

  it('returns conflict when another admin already decided', async () => {
    const { prisma, service } = makeService();
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.decide('booking-1', { decision: BookingDecision.APPROVE }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancels only a future confirmed booking with a conditional update', async () => {
    const { prisma, service, outbox } = makeService();
    const confirmed = { ...booking, status: BookingStatus.CONFIRMED };
    prisma.booking.findUnique
      .mockResolvedValueOnce(confirmed)
      .mockResolvedValueOnce({
        ...confirmed,
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Müşteri talebi',
        cancelledAt: new Date(),
      });
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.cancel('booking-1', {
      reason: 'Müşteri talebi',
    });

    expect(prisma.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: BookingStatus.CONFIRMED }),
      }),
    );
    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      prisma,
      'booking-1',
      'BOOKING_CANCELLED',
    );
  });
});
