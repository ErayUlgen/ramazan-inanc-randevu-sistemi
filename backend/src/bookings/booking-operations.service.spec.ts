/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BookingSource, BookingStatus, VisitStatus } from '@prisma/client';
import { ScheduleValidationService } from '../availability/schedule-validation.service';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingOperationsService } from './booking-operations.service';
import { ProfessionalServiceResolver } from '../scheduling/professional-service-resolver.service';
import { FormsService } from '../forms/forms.service';

describe('BookingOperationsService manual booking creation', () => {
  it('allows an admin to create a booking outside availability rules', async () => {
    const serviceRecord = {
      id: 'service-1',
      name: 'Anatomik Saç Kesimi',
      durationMinutes: 60,
      priceKurus: 90_000,
      preVisitInstructions: null,
      postVisitInstructions: null,
      sortOrder: 0,
    };
    const professional = {
      id: 'professional-1',
      slug: 'ramazan-inanc',
      name: 'Ramazan İnanç',
      title: 'Anatomik Saç Kesim Uzmanı',
      services: [{ serviceId: 'service-1' }],
    };
    const createdAt = new Date('2030-07-01T09:00:00.000Z');
    const booking = {
      id: 'booking-1',
      publicCode: 'RI-MANUAL1',
      branchId: 'branch-1',
      professionalId: professional.id,
      customerId: null,
      status: BookingStatus.CONFIRMED,
      source: BookingSource.ADMIN,
      startAt: new Date('2030-07-22T20:30:00.000Z'),
      endAt: new Date('2030-07-22T21:30:00.000Z'),
      totalDurationMinutes: 60,
      totalPriceKurus: 90_000,
      holdExpiresAt: null,
      holdTokenHash: null,
      customerNameSnapshot: 'Manuel Müşteri',
      customerPhoneSnapshot: null,
      customerNote: null,
      adminNote: null,
      notificationsEnabled: false,
      rejectionReason: null,
      cancellationReason: null,
      approvedAt: createdAt,
      rejectedAt: null,
      cancelledAt: null,
      visitStatus: VisitStatus.SCHEDULED,
      visitStatusUpdatedAt: createdAt,
      revision: 1,
      createdAt,
      updatedAt: createdAt,
      customer: null,
      professional,
      items: [
        {
          id: 'item-1',
          serviceId: serviceRecord.id,
          serviceName: serviceRecord.name,
          durationMinutes: serviceRecord.durationMinutes,
          priceKurus: serviceRecord.priceKurus,
          sortOrder: 0,
        },
      ],
    };
    const prisma = {
      $transaction: jest.fn(),
      $executeRaw: jest.fn().mockResolvedValue(1),
      branch: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'branch-1', isActive: true }),
      },
      service: { findMany: jest.fn().mockResolvedValue([serviceRecord]) },
      professional: { findFirst: jest.fn().mockResolvedValue(professional) },
      customer: { upsert: jest.fn() },
      booking: { create: jest.fn().mockResolvedValue(booking) },
    };
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
    );
    const schedule = { assertAvailable: jest.fn() };
    const outbox = { enqueue: jest.fn() };
    const audit = { write: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const resolver = {
      resolveSelection: jest.fn().mockResolvedValue({
        professional,
        services: [
          {
            serviceId: serviceRecord.id,
            serviceName: serviceRecord.name,
            sortOrder: 0,
            durationMinutes: 60,
            priceKurus: 90_000,
            isOnlineBookable: true,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
            processingStartOffsetMinutes: null,
            processingDurationMinutes: 0,
            preVisitInstructions: null,
            postVisitInstructions: null,
            salonDurationMinutes: 60,
            salonPriceKurus: 90_000,
          },
        ],
        totalDurationMinutes: 60,
        totalPriceKurus: 90_000,
      }),
      buildAbsoluteOccupancy: jest.fn().mockReturnValue([
        {
          professionalId: professional.id,
          startAt: booking.startAt,
          endAt: booking.endAt,
          kind: 'SERVICE',
        },
      ]),
      toBookingItemCreate: jest
        .fn()
        .mockImplementation((item: unknown): unknown => item),
    };
    const operations = new BookingOperationsService(
      prisma as unknown as PrismaService,
      schedule as unknown as ScheduleValidationService,
      outbox as unknown as NotificationOutboxService,
      audit as unknown as OperationsAuditService,
      resolver as unknown as ProfessionalServiceResolver,
      {
        assignRequiredForms: jest.fn(),
      } as unknown as FormsService,
    );

    const result = await operations.create({
      branchSlug: 'hair-art-ramazan-inanc-denizli',
      source: BookingSource.ADMIN,
      fullName: 'Manuel Müşteri',
      serviceIds: ['service-1'],
      professionalId: professional.id,
      date: '2030-07-22',
      startTime: '23:30',
      notificationsEnabled: false,
    });

    expect(schedule.assertAvailable).not.toHaveBeenCalled();
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: BookingSource.ADMIN,
          startAt: new Date('2030-07-22T20:30:00.000Z'),
          endAt: new Date('2030-07-22T21:30:00.000Z'),
        }),
      }),
    );
    expect(result.publicCode).toBe('RI-MANUAL1');
  });
});

describe('BookingOperationsService no-show exception', () => {
  const bookingRecord = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    const createdAt = new Date('2026-07-01T09:00:00.000Z');
    return {
      id: 'booking-1',
      publicCode: 'RI-NOSHOW1',
      branchId: 'branch-1',
      professionalId: 'professional-1',
      customerId: 'customer-1',
      status: BookingStatus.CONFIRMED,
      source: BookingSource.ONLINE,
      startAt: new Date('2020-07-22T09:00:00.000Z'),
      endAt: new Date('2020-07-22T10:00:00.000Z'),
      totalDurationMinutes: 60,
      totalPriceKurus: 90_000,
      holdExpiresAt: null,
      customerNameSnapshot: 'Eray Ülgen',
      customerPhoneSnapshot: '+905551112233',
      customerNote: null,
      adminNote: null,
      notificationsEnabled: true,
      rejectionReason: null,
      cancellationReason: null,
      approvedAt: createdAt,
      rejectedAt: null,
      cancelledAt: null,
      visitStatus: VisitStatus.SCHEDULED,
      visitStatusUpdatedAt: createdAt,
      revision: 3,
      scheduleOverride: false,
      overrideReason: null,
      seriesId: null,
      occurrenceIndex: null,
      isSeriesException: false,
      createdAt,
      updatedAt: createdAt,
      customer: {
        id: 'customer-1',
        fullName: 'Eray Ülgen',
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
      ...overrides,
    };
  };

  const createHarness = (
    existing: Record<string, unknown>,
    transactional: Record<string, unknown> = existing,
  ) => {
    const updated = {
      ...existing,
      visitStatus:
        existing.visitStatus === VisitStatus.NO_SHOW
          ? VisitStatus.SCHEDULED
          : VisitStatus.NO_SHOW,
      revision: Number(existing.revision) + 1,
      updatedAt: new Date(),
    };
    const transaction = {
      booking: {
        findUnique: jest.fn().mockResolvedValue(transactional),
        update: jest.fn().mockResolvedValue(updated),
      },
      bookingNotification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      bookingReview: {
        delete: jest.fn().mockResolvedValue({}),
      },
      adminRealtimeEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      booking: {
        findUnique: jest.fn().mockResolvedValue(existing),
      },
      $transaction: jest.fn(
        (callback: (value: typeof transaction) => unknown) =>
          Promise.resolve(callback(transaction)),
      ),
    };
    const audit = { write: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const service = new BookingOperationsService(
      prisma as unknown as PrismaService,
      {} as ScheduleValidationService,
      {} as NotificationOutboxService,
      audit as unknown as OperationsAuditService,
      {} as ProfessionalServiceResolver,
      {} as FormsService,
    );
    return { service, prisma, transaction, audit };
  };

  it('does not allow no-show before the appointment start', async () => {
    const future = bookingRecord({
      startAt: new Date(Date.now() + 60 * 60_000),
      endAt: new Date(Date.now() + 120 * 60_000),
    });
    const { service, prisma } = createHarness(future);

    await expect(
      service.markNoShow('booking-1', { expectedRevision: 3 }),
    ).rejects.toThrow('Randevu saati gelmeden');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('marks no-show, cancels an unsent review request and records an audit', async () => {
    const existing = bookingRecord();
    const current = {
      ...existing,
      review: {
        id: 'review-1',
        submittedAt: null,
      },
    };
    const { service, transaction, audit } = createHarness(existing, current);

    await expect(
      service.markNoShow('booking-1', {
        expectedRevision: 3,
        note: 'Müşteri gelmedi.',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        visitStatus: VisitStatus.NO_SHOW,
        revision: 4,
      }),
    );
    expect(transaction.bookingNotification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bookingId: 'booking-1' }),
      }),
    );
    expect(transaction.bookingReview.delete).toHaveBeenCalledWith({
      where: { id: 'review-1' },
    });
    expect(audit.write).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'BOOKING_MARKED_NO_SHOW',
        reason: 'Müşteri gelmedi.',
      }),
    );
  });

  it('does not erase a submitted review by marking the booking no-show', async () => {
    const existing = bookingRecord();
    const current = {
      ...existing,
      review: {
        id: 'review-1',
        submittedAt: new Date(),
      },
    };
    const { service, transaction } = createHarness(existing, current);

    await expect(
      service.markNoShow('booking-1', { expectedRevision: 3 }),
    ).rejects.toThrow('değerlendirme gönderildiğinden');
    expect(transaction.booking.update).not.toHaveBeenCalled();
  });

  it('reverts no-show with a required reason and preserves the audit trail', async () => {
    const existing = bookingRecord({ visitStatus: VisitStatus.NO_SHOW });
    const { service, transaction, audit } = createHarness(existing);

    await expect(
      service.revertNoShow('booking-1', {
        expectedRevision: 3,
        reason: 'Yanlış işaret düzeltildi.',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        visitStatus: VisitStatus.SCHEDULED,
        revision: 4,
      }),
    );
    expect(audit.write).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'BOOKING_NO_SHOW_REVERTED',
        reason: 'Yanlış işaret düzeltildi.',
      }),
    );
  });
});
