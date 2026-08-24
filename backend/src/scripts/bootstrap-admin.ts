import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

async function bootstrapAdmin() {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const username = (
    process.env.BOOTSTRAP_ADMIN_USERNAME ?? 'owner'
  ).toLocaleLowerCase('tr-TR');
  const branchSlug =
    process.env.BOOTSTRAP_BRANCH_SLUG ?? 'hair-art-ramazan-inanc-denizli';
  if (!password || password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD en az 12 karakter olmalıdır.');
  }
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const branch = await prisma.branch.findUnique({
      where: { slug: branchSlug },
      select: { id: true, name: true },
    });
    if (!branch) throw new Error('Bootstrap salonu bulunamadı.');
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });
    const user = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.adminUser.upsert({
        where: {
          branchId_username: { branchId: branch.id, username },
        },
        update: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
          isActive: true,
        },
        create: {
          branchId: branch.id,
          username,
          displayName: 'Salon Sahibi',
          passwordHash,
        },
      });
      await transaction.adminSession.updateMany({
        where: { adminUserId: saved.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return saved;
    });
    process.stdout.write(
      `Yönetici hesabı hazır: ${user.username} · ${branch.name}\n`,
    );
  } finally {
    await prisma.onModuleDestroy();
  }
}

void bootstrapAdmin().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Bootstrap başarısız.'}\n`,
  );
  process.exitCode = 1;
});
