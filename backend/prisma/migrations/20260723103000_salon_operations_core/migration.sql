-- Sprint 05: Salon Operations Core
-- Additive migration. Existing bookings, catalogue records and notification history are preserved.

ALTER TYPE "BookingSource" ADD VALUE IF NOT EXISTS 'PHONE';

CREATE TYPE "VisitStatus" AS ENUM (
    'SCHEDULED',
    'ARRIVED',
    'IN_SERVICE',
    'COMPLETED',
    'NO_SHOW'
);

CREATE TYPE "ScheduleBlockKind" AS ENUM (
    'BREAK',
    'UNAVAILABLE',
    'TRAINING',
    'PERSONAL',
    'BRANCH_BLOCK',
    'OTHER'
);

CREATE TYPE "AuditActorType" AS ENUM (
    'ADMIN',
    'CUSTOMER',
    'SYSTEM'
);

ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'BOOKING_CREATED_BY_ADMIN';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'BOOKING_RESCHEDULED';

ALTER TABLE "professionals"
ADD COLUMN "photo_url" TEXT,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "professionals_branch_id_is_online_bookable_idx";
CREATE INDEX "professionals_branch_id_is_active_is_online_bookable_idx"
ON "professionals"("branch_id", "is_active", "is_online_bookable");

ALTER TABLE "services"
ADD COLUMN "is_online_bookable" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "customers"
ADD COLUMN "internal_note" TEXT;

ALTER TABLE "bookings"
ADD COLUMN "customer_name_snapshot" TEXT,
ADD COLUMN "customer_phone_snapshot" TEXT,
ADD COLUMN "admin_note" TEXT,
ADD COLUMN "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "visit_status" "VisitStatus",
ADD COLUMN "visit_status_updated_at" TIMESTAMP(3);

UPDATE "bookings" AS booking
SET
    "customer_name_snapshot" = customer."full_name",
    "customer_phone_snapshot" = customer."phone"
FROM "customers" AS customer
WHERE booking."customer_id" = customer."id";

UPDATE "bookings"
SET
    "visit_status" = 'SCHEDULED',
    "visit_status_updated_at" = COALESCE("approved_at", "updated_at")
WHERE "status" = 'CONFIRMED';

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_revision_positive" CHECK ("revision" > 0);

ALTER TABLE "booking_notifications"
ADD COLUMN "booking_revision" INTEGER,
ADD COLUMN "appointment_start_at" TIMESTAMP(3),
ADD COLUMN "payload" JSONB;

CREATE TABLE "branch_weekly_intervals" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branch_weekly_intervals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "branch_weekly_intervals_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
    CONSTRAINT "branch_weekly_intervals_minutes_check" CHECK (
        "start_minute" >= 0
        AND "end_minute" <= 1440
        AND "start_minute" < "end_minute"
    )
);

CREATE UNIQUE INDEX "branch_weekly_intervals_branch_id_weekday_start_minute_end_minute_key"
ON "branch_weekly_intervals"("branch_id", "weekday", "start_minute", "end_minute");

CREATE INDEX "branch_weekly_intervals_branch_id_weekday_idx"
ON "branch_weekly_intervals"("branch_id", "weekday");

ALTER TABLE "branch_weekly_intervals"
ADD CONSTRAINT "branch_weekly_intervals_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "branch_weekly_intervals"
ADD CONSTRAINT "branch_weekly_intervals_no_overlap"
EXCLUDE USING GIST (
    "branch_id" WITH =,
    "weekday" WITH =,
    int4range("start_minute", "end_minute", '[)') WITH &&
);

-- Preserve the current behaviour: every existing branch remains open on every weekday
-- using its legacy opening/closing minute values.
INSERT INTO "branch_weekly_intervals" (
    "id",
    "branch_id",
    "weekday",
    "start_minute",
    "end_minute",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    branch."id",
    weekday,
    branch."opening_minute",
    branch."closing_minute",
    CURRENT_TIMESTAMP
FROM "branches" AS branch
CROSS JOIN generate_series(0, 6) AS weekday;

CREATE TABLE "branch_date_overrides" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branch_date_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branch_date_overrides_branch_id_date_key"
ON "branch_date_overrides"("branch_id", "date");

CREATE INDEX "branch_date_overrides_branch_id_date_idx"
ON "branch_date_overrides"("branch_id", "date");

ALTER TABLE "branch_date_overrides"
ADD CONSTRAINT "branch_date_overrides_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "branch_date_intervals" (
    "id" TEXT NOT NULL,
    "override_id" TEXT NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branch_date_intervals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "branch_date_intervals_minutes_check" CHECK (
        "start_minute" >= 0
        AND "end_minute" <= 1440
        AND "start_minute" < "end_minute"
    )
);

CREATE UNIQUE INDEX "branch_date_intervals_override_id_start_minute_end_minute_key"
ON "branch_date_intervals"("override_id", "start_minute", "end_minute");

CREATE INDEX "branch_date_intervals_override_id_idx"
ON "branch_date_intervals"("override_id");

ALTER TABLE "branch_date_intervals"
ADD CONSTRAINT "branch_date_intervals_override_id_fkey"
FOREIGN KEY ("override_id") REFERENCES "branch_date_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "branch_date_intervals"
ADD CONSTRAINT "branch_date_intervals_no_overlap"
EXCLUDE USING GIST (
    "override_id" WITH =,
    int4range("start_minute", "end_minute", '[)') WITH &&
);

CREATE TABLE "schedule_blocks" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "kind" "ScheduleBlockKind" NOT NULL,
    "title" TEXT NOT NULL,
    "internal_note" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "schedule_blocks_time_check" CHECK ("start_at" < "end_at"),
    CONSTRAINT "schedule_blocks_scope_check" CHECK (
        ("kind" = 'BRANCH_BLOCK' AND "professional_id" IS NULL)
        OR
        ("kind" <> 'BRANCH_BLOCK' AND "professional_id" IS NOT NULL)
    )
);

CREATE INDEX "schedule_blocks_branch_id_start_at_end_at_idx"
ON "schedule_blocks"("branch_id", "start_at", "end_at");

CREATE INDEX "schedule_blocks_professional_id_start_at_end_at_idx"
ON "schedule_blocks"("professional_id", "start_at", "end_at");

ALTER TABLE "schedule_blocks"
ADD CONSTRAINT "schedule_blocks_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_blocks"
ADD CONSTRAINT "schedule_blocks_professional_id_fkey"
FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "operational_audit_events" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operational_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operational_audit_events_branch_id_created_at_idx"
ON "operational_audit_events"("branch_id", "created_at");

CREATE INDEX "operational_audit_events_booking_id_created_at_idx"
ON "operational_audit_events"("booking_id", "created_at");

CREATE INDEX "operational_audit_events_entity_type_entity_id_created_at_idx"
ON "operational_audit_events"("entity_type", "entity_id", "created_at");

ALTER TABLE "operational_audit_events"
ADD CONSTRAINT "operational_audit_events_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operational_audit_events"
ADD CONSTRAINT "operational_audit_events_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
