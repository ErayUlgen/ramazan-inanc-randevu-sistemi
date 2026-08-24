import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { validateEnvironment } from '../config/validate-environment';

type Finding = {
  level: 'blocker' | 'warning' | 'ok';
  code: string;
  message: string;
};

const findings: Finding[] = [];
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL tanımlı değil.');

const pool = new pg.Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function record(level: Finding['level'], code: string, message: string): void {
  findings.push({ level, code, message });
}

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function looksLikePlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  return /(change|replace|example|demo|test|localhost|örnek|placeholder)/i.test(
    value,
  );
}

async function inspectCatalog(): Promise<void> {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: {
      weeklyIntervals: true,
      bookingPolicy: true,
      services: {
        where: { isActive: true },
        include: {
          professionals: {
            include: { professional: true },
          },
        },
      },
      professionals: {
        where: { isActive: true },
        include: {
          services: true,
        },
      },
    },
  });

  if (!branches.length) {
    record('blocker', 'NO_ACTIVE_BRANCH', 'Aktif salon şubesi bulunamadı.');
    return;
  }
  if (branches.length > 1) {
    record(
      'warning',
      'MULTIPLE_ACTIVE_BRANCHES',
      `${branches.length} aktif şube var; ilk canlı sürüm tek şube varsayımıyla kontrol edilmelidir.`,
    );
  }

  for (const branch of branches) {
    if (!branch.address || looksLikePlaceholder(branch.address)) {
      record(
        'blocker',
        'BRANCH_ADDRESS',
        `${branch.name}: doğrulanmış salon adresi eksik veya geçici görünüyor.`,
      );
    }
    if (!branch.bookingPolicy?.salonPhone) {
      record(
        'blocker',
        'SALON_PHONE',
        `${branch.name}: müşteri iletişim telefonu tanımlı değil.`,
      );
    }
    if (!branch.bookingPolicy?.mapsUrl) {
      record(
        'warning',
        'MAPS_URL',
        `${branch.name}: harita bağlantısı tanımlı değil.`,
      );
    }
    if (!branch.weeklyIntervals.length) {
      record(
        'blocker',
        'BRANCH_SCHEDULE',
        `${branch.name}: haftalık çalışma aralığı bulunamadı.`,
      );
    }
    if (
      branch.openingMinute < 0 ||
      branch.closingMinute > 24 * 60 ||
      branch.openingMinute >= branch.closingMinute
    ) {
      record(
        'blocker',
        'INVALID_BRANCH_HOURS',
        `${branch.name}: çalışma saatleri geçersiz.`,
      );
    }

    if (!branch.services.length) {
      record(
        'blocker',
        'NO_ACTIVE_SERVICES',
        `${branch.name}: aktif hizmet bulunamadı.`,
      );
    }
    for (const service of branch.services) {
      if (service.durationMinutes <= 0 || service.priceKurus < 0) {
        record(
          'blocker',
          'INVALID_SERVICE',
          `${service.name}: süre veya fiyat değeri geçersiz.`,
        );
      }
      const eligibleProfessionals = service.professionals.filter(
        ({ professional, isOnlineBookableOverride }) =>
          professional.isActive &&
          professional.isOnlineBookable &&
          isOnlineBookableOverride !== false,
      );
      if (service.isOnlineBookable && !eligibleProfessionals.length) {
        record(
          'blocker',
          'SERVICE_WITHOUT_PROFESSIONAL',
          `${service.name}: online randevu alabilecek uzman yok.`,
        );
      }
    }

    const onlineProfessionals = branch.professionals.filter(
      (professional) => professional.isOnlineBookable,
    );
    if (!onlineProfessionals.length) {
      record(
        'blocker',
        'NO_ONLINE_PROFESSIONAL',
        `${branch.name}: online randevuya açık uzman bulunamadı.`,
      );
    }
    for (const professional of onlineProfessionals) {
      if (!professional.services.length) {
        record(
          'blocker',
          'PROFESSIONAL_WITHOUT_SERVICE',
          `${professional.name}: hizmet eşlemesi bulunamadı.`,
        );
      }
    }
  }

  const activeAdminCount = await prisma.adminUser.count({
    where: { isActive: true },
  });
  if (!activeAdminCount) {
    record('blocker', 'NO_ACTIVE_ADMIN', 'Aktif yönetici hesabı bulunamadı.');
  }

  record(
    'ok',
    'CATALOG_INSPECTED',
    `${branches.length} şube, ${branches.reduce((sum, branch) => sum + branch.services.length, 0)} hizmet ve ${branches.reduce((sum, branch) => sum + branch.professionals.length, 0)} uzman kontrol edildi.`,
  );
}

function inspectExternalServices(): void {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  const smsConfigured =
    (provider === 'netgsm' &&
      configured(process.env.NETGSM_USERCODE) &&
      configured(process.env.NETGSM_PASSWORD) &&
      configured(process.env.NETGSM_HEADER)) ||
    (provider === 'http' &&
      configured(process.env.SMS_API_URL) &&
      configured(process.env.SMS_API_KEY));

  record(
    smsConfigured ? 'ok' : 'warning',
    'SMS_CONFIGURATION',
    smsConfigured
      ? `SMS sağlayıcısı "${provider}" için gerekli alanlar tanımlı.`
      : 'Gerçek SMS sağlayıcısı henüz hazır değil; bu durum ödeme gerektiren dış bağımlılıktır.',
  );

  if (process.env.NODE_ENV === 'production') {
    try {
      validateEnvironment(process.env);
      record(
        'ok',
        'PRODUCTION_ENVIRONMENT',
        'Production ortam değişkenleri zorunlu güvenlik kontrollerinden geçti.',
      );
    } catch (error) {
      record(
        'blocker',
        'PRODUCTION_ENVIRONMENT',
        error instanceof Error
          ? error.message
          : 'Production ayarları geçersiz.',
      );
    }
  } else {
    record(
      'warning',
      'NON_PRODUCTION_MODE',
      'Kontrol development modunda çalıştı; canlıya çıkmadan önce production ayarlarıyla tekrar çalıştırılmalıdır.',
    );
  }
}

async function main(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
  await inspectCatalog();
  inspectExternalServices();

  const blockers = findings.filter((finding) => finding.level === 'blocker');
  const warnings = findings.filter((finding) => finding.level === 'warning');
  const report = {
    ready: blockers.length === 0,
    checkedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    summary: {
      blockers: blockers.length,
      warnings: warnings.length,
      passed: findings.filter((finding) => finding.level === 'ok').length,
    },
    findings,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = blockers.length ? 1 : 0;
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        ready: false,
        checkedAt: new Date().toISOString(),
        summary: { blockers: 1, warnings: 0, passed: 0 },
        findings: [
          {
            level: 'blocker',
            code: 'READINESS_EXECUTION_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Readiness kontrolü tamamlanamadı.',
          },
        ],
      })}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
