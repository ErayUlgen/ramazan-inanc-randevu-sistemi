-- Sprint 10: scheduling intelligence, staff access, attendance and reviews.
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ATTENDANCE_CONFIRMATION_REQUESTED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ATTENDANCE_CONFIRMED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ATTENDANCE_DECLINED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'REVIEW_REQUESTED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'REVIEW_SUBMITTED';

ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'RECEPTIONIST';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';

CREATE TYPE "AttendanceStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'CONFIRMED', 'DECLINED', 'EXPIRED');
CREATE TYPE "AttendanceResponseSource" AS ENUM ('CUSTOMER_ACCOUNT', 'PUBLIC_LINK', 'ADMIN');
CREATE TYPE "BookingSeriesFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'FOUR_WEEKLY', 'MONTHLY');
CREATE TYPE "BookingSeriesStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');
CREATE TYPE "BookingOccupancyKind" AS ENUM ('SERVICE', 'PRE_BUFFER', 'POST_BUFFER');
CREATE TYPE "ReviewSource" AS ENUM ('CUSTOMER_ACCOUNT', 'PUBLIC_LINK');

ALTER TABLE "professional_services"
  ADD COLUMN "duration_minutes_override" INTEGER,
  ADD COLUMN "price_kurus_override" INTEGER,
  ADD COLUMN "is_online_bookable_override" BOOLEAN,
  ADD COLUMN "buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processing_start_offset_minutes" INTEGER,
  ADD COLUMN "processing_duration_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "booking_items"
  ADD COLUMN "buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processing_start_offset_minutes" INTEGER,
  ADD COLUMN "processing_duration_minutes" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
  ADD COLUMN "attendance_status" "AttendanceStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "attendance_requested_at" TIMESTAMP(3),
  ADD COLUMN "attendance_responded_at" TIMESTAMP(3),
  ADD COLUMN "attendance_response_source" "AttendanceResponseSource",
  ADD COLUMN "attendance_token_hash" TEXT,
  ADD COLUMN "attendance_token_expires_at" TIMESTAMP(3),
  ADD COLUMN "series_id" TEXT,
  ADD COLUMN "occurrence_index" INTEGER,
  ADD COLUMN "is_series_exception" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "branch_booking_policies"
  ADD COLUMN "attendance_confirmation_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "attendance_confirmation_lead_minutes" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN "attendance_confirmation_minimum_notice_minutes" INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN "review_request_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "review_request_delay_minutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "review_request_expiry_days" INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN "google_review_url" TEXT;

ALTER TABLE "admin_users" ADD COLUMN "professional_id" TEXT;

ALTER TABLE "booking_change_requests"
  ADD COLUMN "requested_total_duration_minutes" INTEGER,
  ADD COLUMN "requested_total_price_kurus" INTEGER,
  ADD COLUMN "service_snapshot" JSONB;

ALTER TABLE "waitlist_offers"
  ADD COLUMN "total_duration_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "total_price_kurus" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "service_snapshot" JSONB;

CREATE TABLE "booking_series" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "professional_id" TEXT NOT NULL,
  "frequency" "BookingSeriesFrequency" NOT NULL,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE,
  "occurrence_count" INTEGER NOT NULL,
  "status" "BookingSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_actor_type" "AuditActorType" NOT NULL,
  "created_by_admin_user_id" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_series_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_occupancy_segments" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "kind" "BookingOccupancyKind" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_occupancy_segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_reviews" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "branch_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "rating" INTEGER,
  "comment" TEXT,
  "source" "ReviewSource",
  "submitted_at" TIMESTAMP(3),
  "request_sent_at" TIMESTAMP(3),
  "request_token_hash" TEXT NOT NULL,
  "request_expires_at" TIMESTAMP(3) NOT NULL,
  "admin_read_at" TIMESTAMP(3),
  "admin_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_change_occupancy_segments" (
  "id" TEXT NOT NULL,
  "change_request_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "kind" "BookingOccupancyKind" NOT NULL,
  CONSTRAINT "booking_change_occupancy_segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "waitlist_offer_occupancy_segments" (
  "id" TEXT NOT NULL,
  "waitlist_offer_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "kind" "BookingOccupancyKind" NOT NULL,
  CONSTRAINT "waitlist_offer_occupancy_segments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookings_attendance_token_hash_key" ON "bookings"("attendance_token_hash");
CREATE INDEX "bookings_series_id_occurrence_index_idx" ON "bookings"("series_id", "occurrence_index");
CREATE INDEX "bookings_attendance_status_start_at_idx" ON "bookings"("attendance_status", "start_at");
CREATE UNIQUE INDEX "booking_series_idempotency_key_key" ON "booking_series"("idempotency_key");
CREATE INDEX "booking_series_branch_id_status_starts_on_idx" ON "booking_series"("branch_id", "status", "starts_on");
CREATE INDEX "booking_series_customer_id_status_idx" ON "booking_series"("customer_id", "status");
CREATE INDEX "booking_occupancy_segments_professional_id_start_at_end_at_idx" ON "booking_occupancy_segments"("professional_id", "start_at", "end_at");
CREATE INDEX "booking_occupancy_segments_booking_id_start_at_idx" ON "booking_occupancy_segments"("booking_id", "start_at");
CREATE UNIQUE INDEX "booking_reviews_booking_id_key" ON "booking_reviews"("booking_id");
CREATE UNIQUE INDEX "booking_reviews_request_token_hash_key" ON "booking_reviews"("request_token_hash");
CREATE INDEX "booking_reviews_branch_id_submitted_at_idx" ON "booking_reviews"("branch_id", "submitted_at");
CREATE INDEX "booking_reviews_professional_id_submitted_at_idx" ON "booking_reviews"("professional_id", "submitted_at");
CREATE INDEX "booking_reviews_customer_id_submitted_at_idx" ON "booking_reviews"("customer_id", "submitted_at");
CREATE INDEX "admin_users_professional_id_is_active_idx" ON "admin_users"("professional_id", "is_active");
CREATE INDEX "booking_change_occupancy_segments_professional_id_start_at_end_at_idx" ON "booking_change_occupancy_segments"("professional_id", "start_at", "end_at");
CREATE INDEX "booking_change_occupancy_segments_change_request_id_idx" ON "booking_change_occupancy_segments"("change_request_id");
CREATE INDEX "waitlist_offer_occupancy_segments_professional_id_start_at_end_at_idx" ON "waitlist_offer_occupancy_segments"("professional_id", "start_at", "end_at");
CREATE INDEX "waitlist_offer_occupancy_segments_waitlist_offer_id_idx" ON "waitlist_offer_occupancy_segments"("waitlist_offer_id");

ALTER TABLE "booking_series" ADD CONSTRAINT "booking_series_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_series" ADD CONSTRAINT "booking_series_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_series" ADD CONSTRAINT "booking_series_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "booking_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_occupancy_segments" ADD CONSTRAINT "booking_occupancy_segments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_occupancy_segments" ADD CONSTRAINT "booking_occupancy_segments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_reviews" ADD CONSTRAINT "booking_reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_reviews" ADD CONSTRAINT "booking_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_reviews" ADD CONSTRAINT "booking_reviews_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_reviews" ADD CONSTRAINT "booking_reviews_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_change_occupancy_segments" ADD CONSTRAINT "booking_change_occupancy_segments_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "booking_change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waitlist_offer_occupancy_segments" ADD CONSTRAINT "waitlist_offer_occupancy_segments_waitlist_offer_id_fkey" FOREIGN KEY ("waitlist_offer_id") REFERENCES "waitlist_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "professional_services"
  ADD CONSTRAINT "professional_services_duration_override_check" CHECK ("duration_minutes_override" IS NULL OR ("duration_minutes_override" > 0 AND "duration_minutes_override" % 5 = 0)),
  ADD CONSTRAINT "professional_services_price_override_check" CHECK ("price_kurus_override" IS NULL OR "price_kurus_override" >= 0),
  ADD CONSTRAINT "professional_services_buffer_before_check" CHECK ("buffer_before_minutes" >= 0 AND "buffer_before_minutes" % 5 = 0),
  ADD CONSTRAINT "professional_services_buffer_after_check" CHECK ("buffer_after_minutes" >= 0 AND "buffer_after_minutes" % 5 = 0),
  ADD CONSTRAINT "professional_services_processing_check" CHECK (
    "processing_duration_minutes" >= 0
    AND "processing_duration_minutes" % 5 = 0
    AND (
      ("processing_duration_minutes" = 0 AND "processing_start_offset_minutes" IS NULL)
      OR
      ("processing_duration_minutes" > 0 AND "processing_start_offset_minutes" IS NOT NULL AND "processing_start_offset_minutes" > 0)
    )
  );

ALTER TABLE "booking_reviews" ADD CONSTRAINT "booking_reviews_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

UPDATE "booking_change_requests" r
SET
  "requested_total_duration_minutes" = b."total_duration_minutes",
  "requested_total_price_kurus" = b."total_price_kurus"
FROM "bookings" b
WHERE b."id" = r."booking_id";

UPDATE "waitlist_offers" o
SET
  "total_duration_minutes" = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (o."end_at" - o."start_at")) / 60)::INTEGER),
  "total_price_kurus" = COALESCE((
    SELECT SUM(s."price_kurus")::INTEGER
    FROM "waitlist_entry_services" wes
    JOIN "services" s ON s."id" = wes."service_id"
    WHERE wes."waitlist_entry_id" = o."waitlist_entry_id"
  ), 0);

-- The original online-booking exclusion constraint covered the full customer
-- appointment. Processing windows intentionally allow the professional to be
-- available, so overlap safety now relies on the branch advisory lock and the
-- shared occupancy-segment validator.
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "booking_no_overlap";

INSERT INTO "booking_occupancy_segments" ("id", "booking_id", "professional_id", "start_at", "end_at", "kind", "created_at")
SELECT gen_random_uuid()::text, b."id", b."professional_id", b."start_at", b."end_at", 'SERVICE', CURRENT_TIMESTAMP
FROM "bookings" b
WHERE NOT EXISTS (
  SELECT 1 FROM "booking_occupancy_segments" s WHERE s."booking_id" = b."id"
);

INSERT INTO "booking_change_occupancy_segments" ("id", "change_request_id", "professional_id", "start_at", "end_at", "kind")
SELECT gen_random_uuid()::text, r."id", r."requested_professional_id", r."requested_start_at", r."requested_end_at", 'SERVICE'
FROM "booking_change_requests" r
WHERE NOT EXISTS (
  SELECT 1 FROM "booking_change_occupancy_segments" s WHERE s."change_request_id" = r."id"
);

INSERT INTO "waitlist_offer_occupancy_segments" ("id", "waitlist_offer_id", "professional_id", "start_at", "end_at", "kind")
SELECT gen_random_uuid()::text, o."id", o."professional_id", o."start_at", o."end_at", 'SERVICE'
FROM "waitlist_offers" o
WHERE NOT EXISTS (
  SELECT 1 FROM "waitlist_offer_occupancy_segments" s WHERE s."waitlist_offer_id" = o."id"
);
