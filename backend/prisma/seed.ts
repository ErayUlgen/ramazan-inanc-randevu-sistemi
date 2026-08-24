import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

if (
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_PRODUCTION_SEED !== 'true'
) {
  throw new Error(
    'Production veritabanında seed işlemi varsayılan olarak kapalıdır. Bilinçli kullanım için ALLOW_PRODUCTION_SEED=true gereklidir.',
  );
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL tanımlı değil.');

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString })),
});

const services = [
  {
    slug: 'anatomik-sac-kesimi',
    category: 'Erkek Hizmetleri',
    name: 'Anatomik Saç Kesimi',
    description:
      'Yüz formu, saç yapısı ve günlük kullanım alışkanlıklarına göre kişiselleştirilen imza kesim.',
    durationMinutes: 60,
    priceKurus: 90000,
  },
  {
    slug: 'sac-sakal-tasarimi',
    category: 'Erkek Hizmetleri',
    name: 'Saç + Sakal Tasarımı',
    description:
      'Saç ve sakalın birlikte ele alındığı dengeli, bütünsel görünüm tasarımı.',
    durationMinutes: 75,
    priceKurus: 125000,
  },
  {
    slug: 'sakal-tasarimi',
    category: 'Erkek Hizmetleri',
    name: 'Sakal Tasarımı',
    description: 'Yüz hatlarına uygun form, sıcak havlu ve detaylı bitiriş.',
    durationMinutes: 30,
    priceKurus: 50000,
  },
  {
    slug: 'sac-yikama-sekillendirme',
    category: 'Erkek Hizmetleri',
    name: 'Saç Yıkama & Şekillendirme',
    description:
      'Saç tipine uygun ürünlerle bakım, yıkama ve profesyonel şekillendirme.',
    durationMinutes: 30,
    priceKurus: 45000,
  },
  {
    slug: 'kadin-anatomik-sac-kesimi',
    category: 'Kadın Hizmetleri',
    name: 'Kadın Anatomik Saç Kesimi',
    description:
      'Yüz anatomisi, saç yoğunluğu ve stil beklentisine göre danışmanlık eşliğinde kesim.',
    durationMinutes: 75,
    priceKurus: 150000,
  },
  {
    slug: 'fon',
    category: 'Kadın Hizmetleri',
    name: 'Fön',
    description:
      'Saç yapısına uygun ürün ve teknikle uzun süre formunu koruyan profesyonel fön.',
    durationMinutes: 45,
    priceKurus: 65000,
  },
  {
    slug: 'kas-tasarimi',
    category: 'Kadın Hizmetleri',
    name: 'Kaş Tasarımı',
    description: 'Yüz ifadesini destekleyen doğal ve dengeli kaş formu.',
    durationMinutes: 15,
    priceKurus: 35000,
  },
];

const professionals = [
  'Ramazan İnanç',
  'Hikmet Çetin Aygördü',
  'Ali Poyraz Yılmaz',
  'Velihan Uluşan',
  'Mustafa Akpiliç',
];

const slugify = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function main() {
  const branch = await prisma.branch.upsert({
    where: { slug: 'hair-art-ramazan-inanc-denizli' },
    update: {
      name: 'Ramazan İnanç Hair Art Studio',
      city: 'Denizli',
      district: 'Merkezefendi',
      address: 'Yenişafak, 1037 Sk. A Blok No.4 AB, 20300 Merkezefendi/Denizli',
      arrivalLeadMinutes: 15,
      reminderLeadMinutes: 120,
    },
    create: {
      slug: 'hair-art-ramazan-inanc-denizli',
      name: 'Ramazan İnanç Hair Art Studio',
      city: 'Denizli',
      district: 'Merkezefendi',
      address: 'Yenişafak, 1037 Sk. A Blok No.4 AB, 20300 Merkezefendi/Denizli',
      openingMinute: 600,
      closingMinute: 1260,
      arrivalLeadMinutes: 15,
      reminderLeadMinutes: 120,
      requiresBookingApproval: true,
    },
  });

  await prisma.branchWeeklyInterval.createMany({
    data: Array.from({ length: 7 }, (_, weekday) => ({
      branchId: branch.id,
      weekday,
      startMinute: branch.openingMinute,
      endMinute: branch.closingMinute,
    })),
    skipDuplicates: true,
  });

  const savedServices = [];
  for (const [index, service] of services.entries()) {
    savedServices.push(
      await prisma.service.upsert({
        where: { branchId_slug: { branchId: branch.id, slug: service.slug } },
        update: { ...service, sortOrder: index },
        create: { ...service, branchId: branch.id, sortOrder: index },
      }),
    );
  }

  for (const [index, name] of professionals.entries()) {
    const professional = await prisma.professional.upsert({
      where: { branchId_slug: { branchId: branch.id, slug: slugify(name) } },
      update: { name, sortOrder: index, isOnlineBookable: true },
      create: {
        branchId: branch.id,
        slug: slugify(name),
        name,
        title: 'Anatomik Saç Kesim Uzmanı',
        sortOrder: index,
        isOnlineBookable: true,
      },
    });

    await prisma.professionalService.createMany({
      data: savedServices.map((service) => ({
        professionalId: professional.id,
        serviceId: service.id,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.branchBookingPolicy.upsert({
    where: { branchId: branch.id },
    update: {
      earlyArrivalMinutes: 15,
      reminderLeadMinutes: 120,
      reviewRequestEnabled: true,
      reviewRequestDelayMinutes: 30,
      reviewRequestExpiryDays: 30,
    },
    create: {
      branchId: branch.id,
      earlyArrivalMinutes: branch.arrivalLeadMinutes,
      reminderLeadMinutes: branch.reminderLeadMinutes,
      reviewRequestEnabled: true,
      reviewRequestDelayMinutes: 30,
      reviewRequestExpiryDays: 30,
      salonPhone: '+905442631902',
      mapsUrl:
        'https://www.google.com/maps/place//data=!4m2!3m1!1s0x14c741125ac99709:0xad2bff10cae2c3ed?sa=X&ved=1t:8290&ictx=111',
    },
  });
  await prisma.branchBookingPolicy.updateMany({
    where: { branchId: branch.id, salonPhone: null },
    data: { salonPhone: '+905442631902' },
  });
  await prisma.branchBookingPolicy.updateMany({
    where: { branchId: branch.id, mapsUrl: null },
    data: {
      mapsUrl:
        'https://www.google.com/maps/place//data=!4m2!3m1!1s0x14c741125ac99709:0xad2bff10cae2c3ed?sa=X&ved=1t:8290&ictx=111',
    },
  });
  await prisma.notificationRule.updateMany({
    where: {
      branchId: branch.id,
      eventType: 'BOOKING_REMINDER',
      channel: 'SMS',
    },
    data: { leadMinutes: 120 },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
