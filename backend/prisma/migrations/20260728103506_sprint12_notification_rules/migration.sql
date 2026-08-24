-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'FORM_PENDING';
ALTER TYPE "NotificationEventType" ADD VALUE 'DEPOSIT_PENDING';
ALTER TYPE "NotificationEventType" ADD VALUE 'DEPOSIT_EXPIRED';

-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "notification_rules" ADD COLUMN     "booking_statuses" JSONB;

-- Preserve the existing single 30-minute reminder behavior as the first rule.
INSERT INTO "notification_rules" (
  "id",
  "branch_id",
  "event_type",
  "channel",
  "lead_minutes",
  "booking_statuses",
  "is_active",
  "sort_order",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  branch."id",
  'BOOKING_REMINDER'::"NotificationEventType",
  'SMS'::"NotificationChannel",
  branch."reminder_lead_minutes",
  '["CONFIRMED"]'::jsonb,
  TRUE,
  0,
  NOW(),
  NOW()
FROM "branches" branch
WHERE NOT EXISTS (
  SELECT 1
  FROM "notification_rules" rule
  WHERE rule."branch_id" = branch."id"
);
