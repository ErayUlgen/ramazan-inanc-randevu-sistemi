import 'dotenv/config';
import {
  BookingChangeRequestStatus,
  BookingSource,
  BookingStatus,
  WaitlistOfferStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Sprint 06 PostgreSQL concurrency invariants', () => {
  const runId = `s6qa-${randomUUID()}`;
  const waitlistEntryIds: string[] = [];
  const bookingIds: string[] = [];
  const changeRequestIds: string[] = [];
  const prisma = new PrismaService();
  let branchId: string;
  let professionalId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const professional = await prisma.professional.findFirst({
      where: { isActive: true },
      select: { id: true, branchId: true },
    });
    if (!professional) {
      throw new Error('Concurrency QA için aktif uzman bulunamadı.');
    }
    branchId = professional.branchId;
    professionalId = professional.id;
  });

  afterAll(async () => {
    if (changeRequestIds.length) {
      await prisma.bookingChangeRequest.deleteMany({
        where: { id: { in: changeRequestIds } },
      });
    }
    if (waitlistEntryIds.length) {
      await prisma.waitlistEntry.deleteMany({
        where: { id: { in: waitlistEntryIds } },
      });
    }
    if (bookingIds.length) {
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await prisma.slotRecoveryEvent.deleteMany({
      where: { sourceId: { startsWith: runId } },
    });
    await prisma.onModuleDestroy();
  });

  it('allows only one overlapping online booking for a professional', async () => {
    const startAt = new Date('2098-01-12T08:00:00.000Z');
    const endAt = new Date('2098-01-12T09:00:00.000Z');
    const attempts = await Promise.allSettled(
      [1, 2].map((number) =>
        prisma.booking.create({
          data: {
            publicCode: `${runId}-overlap-${number}`,
            branchId,
            professionalId,
            source: BookingSource.ONLINE,
            status: BookingStatus.CONFIRMED,
            startAt,
            endAt,
            totalDurationMinutes: 60,
            totalPriceKurus: 0,
            customerNameSnapshot: 'Sprint 06 Concurrency QA',
            notificationsEnabled: false,
          },
          select: { id: true },
        }),
      ),
    );

    const fulfilled = attempts.filter(
      (result): result is PromiseFulfilledResult<{ id: string }> =>
        result.status === 'fulfilled',
    );
    bookingIds.push(...fulfilled.map((result) => result.value.id));
    expect(fulfilled).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });

  it('allows deliberate overlapping manual bookings for a professional', async () => {
    const startAt = new Date('2098-01-13T08:00:00.000Z');
    const endAt = new Date('2098-01-13T09:00:00.000Z');
    const attempts = await Promise.allSettled(
      [1, 2].map((number) =>
        prisma.booking.create({
          data: {
            publicCode: `${runId}-manual-overlap-${number}`,
            branchId,
            professionalId,
            source: BookingSource.ADMIN,
            status: BookingStatus.CONFIRMED,
            startAt,
            endAt,
            totalDurationMinutes: 60,
            totalPriceKurus: 0,
            customerNameSnapshot: 'Sprint 08 Manuel Çakışma QA',
            notificationsEnabled: false,
          },
          select: { id: true },
        }),
      ),
    );

    const fulfilled = attempts.filter(
      (result): result is PromiseFulfilledResult<{ id: string }> =>
        result.status === 'fulfilled',
    );
    bookingIds.push(...fulfilled.map((result) => result.value.id));
    expect(fulfilled).toHaveLength(2);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(0);
  });

  it('allows only one pending offer for the same recovered slot and one acceptance', async () => {
    const entries = await Promise.all(
      [1, 2].map((number) =>
        prisma.waitlistEntry.create({
          data: {
            branchId,
            professionalId,
            fullName: `Sprint 06 Waitlist QA ${number}`,
            phone: `+90555000${String(number).padStart(4, '0')}`,
            dateFrom: new Date('2098-02-10T00:00:00.000Z'),
            dateTo: new Date('2098-02-10T00:00:00.000Z'),
            startMinute: 600,
            endMinute: 1260,
            accessTokenHash: `${runId}-access-${number}`,
          },
          select: { id: true },
        }),
      ),
    );
    waitlistEntryIds.push(...entries.map((entry) => entry.id));

    const startAt = new Date('2098-02-10T10:00:00.000Z');
    const endAt = new Date('2098-02-10T11:00:00.000Z');
    const attempts = await Promise.allSettled(
      entries.map((entry, index) =>
        prisma.waitlistOffer.create({
          data: {
            branchId,
            waitlistEntryId: entry.id,
            professionalId,
            status: WaitlistOfferStatus.PENDING,
            startAt,
            endAt,
            expiresAt: new Date('2098-02-10T09:00:00.000Z'),
            tokenHash: `${runId}-offer-${index}`,
          },
          select: { id: true },
        }),
      ),
    );

    const winner = attempts.find(
      (result): result is PromiseFulfilledResult<{ id: string }> =>
        result.status === 'fulfilled',
    );
    expect(winner).toBeDefined();
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    const decisions = await Promise.all([
      prisma.waitlistOffer.updateMany({
        where: { id: winner!.value.id, status: WaitlistOfferStatus.PENDING },
        data: {
          status: WaitlistOfferStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      }),
      prisma.waitlistOffer.updateMany({
        where: { id: winner!.value.id, status: WaitlistOfferStatus.PENDING },
        data: {
          status: WaitlistOfferStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      }),
    ]);
    expect(decisions.map((decision) => decision.count).sort()).toEqual([0, 1]);
  });

  it('allows only one admin decision and one cancellation transition', async () => {
    const booking = await prisma.booking.create({
      data: {
        publicCode: `${runId}-decision`,
        branchId,
        professionalId,
        source: BookingSource.ADMIN,
        status: BookingStatus.CONFIRMED,
        startAt: new Date('2098-03-14T08:00:00.000Z'),
        endAt: new Date('2098-03-14T09:00:00.000Z'),
        totalDurationMinutes: 60,
        totalPriceKurus: 0,
        customerNameSnapshot: 'Sprint 06 Decision QA',
        notificationsEnabled: false,
      },
      select: { id: true },
    });
    bookingIds.push(booking.id);

    const request = await prisma.bookingChangeRequest.create({
      data: {
        branchId,
        bookingId: booking.id,
        requestedProfessionalId: professionalId,
        status: BookingChangeRequestStatus.PENDING,
        requestedStartAt: new Date('2098-03-15T08:00:00.000Z'),
        requestedEndAt: new Date('2098-03-15T09:00:00.000Z'),
        bookingRevision: 1,
        expiresAt: new Date('2098-03-14T10:00:00.000Z'),
      },
      select: { id: true },
    });
    changeRequestIds.push(request.id);

    const approvals = await Promise.all([
      prisma.bookingChangeRequest.updateMany({
        where: {
          id: request.id,
          status: BookingChangeRequestStatus.PENDING,
        },
        data: {
          status: BookingChangeRequestStatus.APPROVED,
          decidedAt: new Date(),
        },
      }),
      prisma.bookingChangeRequest.updateMany({
        where: {
          id: request.id,
          status: BookingChangeRequestStatus.PENDING,
        },
        data: {
          status: BookingChangeRequestStatus.APPROVED,
          decidedAt: new Date(),
        },
      }),
    ]);
    expect(approvals.map((approval) => approval.count).sort()).toEqual([0, 1]);

    const cancellations = await Promise.all([
      prisma.booking.updateMany({
        where: { id: booking.id, status: BookingStatus.CONFIRMED },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      }),
      prisma.booking.updateMany({
        where: { id: booking.id, status: BookingStatus.CONFIRMED },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      }),
    ]);
    expect(
      cancellations.map((cancellation) => cancellation.count).sort(),
    ).toEqual([0, 1]);
  });

  it('deduplicates slot-recovery events at the database boundary', async () => {
    const data = {
      branchId,
      professionalId,
      startAt: new Date('2098-04-12T08:00:00.000Z'),
      endAt: new Date('2098-04-12T09:00:00.000Z'),
      sourceType: 'CONCURRENCY_QA',
      sourceId: `${runId}-recovery`,
    };
    const attempts = await Promise.allSettled([
      prisma.slotRecoveryEvent.create({ data }),
      prisma.slotRecoveryEvent.create({ data }),
    ]);

    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });
});
