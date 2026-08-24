import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AdminRole,
  BookingOccupancyKind,
  BookingSource,
  BookingStatus,
  PrismaClient,
  VisitStatus,
  WaitlistEntryStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import pg from 'pg';

const allowedEnvironments = new Set(['development', 'test']);
const environment = process.env.NODE_ENV ?? 'development';
const dryRun = process.env.PILOT_SEED_DRY_RUN === 'true';

if (!allowedEnvironments.has(environment)) {
  throw new Error(
    'Pilot verisi yalnız development veya test ortamında üretilebilir.',
  );
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL tanımlı değil.');

const password = process.env.PILOT_PASSWORD;
if (!dryRun && (!password || password.length < 12)) {
  throw new Error(
    'PILOT_PASSWORD en az 12 karakter olmalıdır. Parola kaynak koda yazılmaz.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString })),
});

function atDayOffset(dayOffset: number, hour: number): Date {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  value.setDate(value.getDate() + dayOffset);
  return value;
}

async function main() {
  const branch = await prisma.branch.findUnique({
    where: { slug: 'hair-art-ramazan-inanc-denizli' },
    include: {
      professionals: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 2,
      },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    },
  });
  if (!branch)
    throw new Error('Pilot salonu bulunamadı; önce db:seed çalıştırın.');
  if (!branch.professionals.length || !branch.services.length) {
    throw new Error('Pilot için aktif uzman ve hizmet bulunmalıdır.');
  }

  if (dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          ready: true,
          mode: 'dry-run',
          branch: branch.name,
          professionalCount: branch.professionals.length,
          serviceCount: branch.services.length,
          willCreate: {
            roles: ['OWNER', 'RECEPTIONIST', 'PROFESSIONAL'],
            customers: 2,
            bookings: ['PENDING_APPROVAL', 'CONFIRMED', 'PAST', 'NO_SHOW'],
            waitlistEntries: 1,
          },
        },
        null,
        2,
      ) + '\n',
    );
    return;
  }

  const passwordHash = await argon2.hash(password!, {
    type: argon2.argon2id,
  });
  const primaryProfessional = branch.professionals[0];
  const secondaryProfessional = branch.professionals[1] ?? primaryProfessional;
  const service = branch.services[0];

  const adminFixtures = [
    {
      username: 'pilot-owner',
      displayName: 'Pilot Salon Sahibi',
      role: AdminRole.OWNER,
      professionalId: null,
    },
    {
      username: 'pilot-reception',
      displayName: 'Pilot Resepsiyon',
      role: AdminRole.RECEPTIONIST,
      professionalId: null,
    },
    {
      username: 'pilot-professional',
      displayName: 'Pilot Uzman',
      role: AdminRole.PROFESSIONAL,
      professionalId: primaryProfessional.id,
    },
  ];
  for (const fixture of adminFixtures) {
    await prisma.adminUser.upsert({
      where: {
        branchId_username: {
          branchId: branch.id,
          username: fixture.username,
        },
      },
      create: {
        branchId: branch.id,
        passwordHash,
        isActive: true,
        ...fixture,
      },
      update: {
        displayName: fixture.displayName,
        role: fixture.role,
        professionalId: fixture.professionalId,
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        isActive: true,
      },
    });
  }

  const newCustomer = await prisma.customer.upsert({
    where: { phone: '+905550000101' },
    create: {
      fullName: 'Pilot Yeni Müşteri',
      phone: '+905550000101',
      internalNote: 'Yalnız kapalı pilot verisidir.',
    },
    update: { fullName: 'Pilot Yeni Müşteri' },
  });
  const returningCustomer = await prisma.customer.upsert({
    where: { phone: '+905550000102' },
    create: {
      fullName: 'Pilot Tekrar Gelen',
      phone: '+905550000102',
      internalNote: 'Yalnız kapalı pilot verisidir.',
    },
    update: { fullName: 'Pilot Tekrar Gelen' },
  });

  const bookingFixtures = [
    {
      publicCode: 'PILOT-PENDING',
      customer: newCustomer,
      professionalId: primaryProfessional.id,
      status: BookingStatus.PENDING_APPROVAL,
      visitStatus: VisitStatus.SCHEDULED,
      startAt: atDayOffset(1, 10),
    },
    {
      publicCode: 'PILOT-CONFIRMED',
      customer: returningCustomer,
      professionalId: secondaryProfessional.id,
      status: BookingStatus.CONFIRMED,
      visitStatus: VisitStatus.SCHEDULED,
      startAt: atDayOffset(2, 12),
    },
    {
      publicCode: 'PILOT-PAST',
      customer: returningCustomer,
      professionalId: primaryProfessional.id,
      status: BookingStatus.CONFIRMED,
      visitStatus: VisitStatus.SCHEDULED,
      startAt: atDayOffset(-2, 14),
    },
    {
      publicCode: 'PILOT-NOSHOW',
      customer: newCustomer,
      professionalId: secondaryProfessional.id,
      status: BookingStatus.CONFIRMED,
      visitStatus: VisitStatus.NO_SHOW,
      startAt: atDayOffset(-1, 16),
    },
  ];

  for (const fixture of bookingFixtures) {
    const endAt = new Date(
      fixture.startAt.getTime() + service.durationMinutes * 60_000,
    );
    const approvedAt =
      fixture.status === BookingStatus.CONFIRMED ? new Date() : null;
    const data = {
      branchId: branch.id,
      professionalId: fixture.professionalId,
      customerId: fixture.customer.id,
      status: fixture.status,
      source: BookingSource.ADMIN,
      startAt: fixture.startAt,
      endAt,
      totalDurationMinutes: service.durationMinutes,
      totalPriceKurus: service.priceKurus,
      customerNameSnapshot: fixture.customer.fullName,
      customerPhoneSnapshot: fixture.customer.phone,
      adminNote: 'Kapalı pilot senaryosu',
      visitStatus: fixture.visitStatus,
      visitStatusUpdatedAt: new Date(),
      approvedAt,
      holdExpiresAt: null,
      holdTokenHash: null,
    };
    await prisma.booking.upsert({
      where: { publicCode: fixture.publicCode },
      create: {
        publicCode: fixture.publicCode,
        ...data,
        items: {
          create: {
            serviceId: service.id,
            serviceName: service.name,
            durationMinutes: service.durationMinutes,
            priceKurus: service.priceKurus,
          },
        },
        occupancySegments: {
          create: {
            professionalId: fixture.professionalId,
            startAt: fixture.startAt,
            endAt,
            kind: BookingOccupancyKind.SERVICE,
          },
        },
      },
      update: {
        ...data,
        items: {
          deleteMany: {},
          create: {
            serviceId: service.id,
            serviceName: service.name,
            durationMinutes: service.durationMinutes,
            priceKurus: service.priceKurus,
          },
        },
        occupancySegments: {
          deleteMany: {},
          create: {
            professionalId: fixture.professionalId,
            startAt: fixture.startAt,
            endAt,
            kind: BookingOccupancyKind.SERVICE,
          },
        },
      },
    });
  }

  const accessTokenHash = createHash('sha256')
    .update('ramazan-inanc-pilot-waitlist')
    .digest('hex');
  await prisma.waitlistEntry.deleteMany({ where: { accessTokenHash } });
  await prisma.waitlistEntry.create({
    data: {
      branchId: branch.id,
      customerId: newCustomer.id,
      fullName: newCustomer.fullName,
      phone: newCustomer.phone,
      note: 'Kapalı pilot bekleme listesi senaryosu',
      dateFrom: atDayOffset(1, 0),
      dateTo: atDayOffset(7, 0),
      startMinute: 600,
      endMinute: 1260,
      status: WaitlistEntryStatus.ACTIVE,
      accessTokenHash,
      services: {
        create: { serviceId: service.id },
      },
    },
  });

  process.stdout.write(
    'Kapalı pilot verisi hazır: 3 rol, 2 müşteri, 4 randevu ve 1 bekleme listesi kaydı.\n',
  );
}

void main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Pilot seed başarısız.'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
