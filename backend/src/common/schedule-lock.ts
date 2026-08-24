import { Prisma } from '@prisma/client';

export async function lockBranchSchedule(
  transaction: Prisma.TransactionClient,
  branchId: string,
): Promise<void> {
  await transaction.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${'salon-schedule:' + branchId}))`,
  );
}

export function intervalsOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}
