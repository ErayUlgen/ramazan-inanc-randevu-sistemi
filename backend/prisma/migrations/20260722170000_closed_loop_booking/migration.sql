-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM (
    'BOOKING_RECEIVED',
    'BOOKING_APPROVED',
    'BOOKING_REJECTED',
    'BOOKING_CANCELLED',
    'BOOKING_REMINDER'
);

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'RETRY_SCHEDULED',
    'FAILED',
    'SKIPPED'
);

-- CreateTable
CREATE TABLE "booking_access_challenges" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "reference_hash" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "request_ip_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_access_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_notifications" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'SMS',
    "event_type" "NotificationEventType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "available_at" TIMESTAMP(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 4,
    "last_attempt_at" TIMESTAMP(3),
    "processing_started_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "provider" TEXT,
    "provider_message_id" TEXT,
    "provider_response_code" TEXT,
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "payload_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "booking_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_access_challenges_booking_id_created_at_idx" ON "booking_access_challenges"("booking_id", "created_at");
CREATE INDEX "booking_access_challenges_phone_hash_created_at_idx" ON "booking_access_challenges"("phone_hash", "created_at");
CREATE INDEX "booking_access_challenges_request_ip_hash_created_at_idx" ON "booking_access_challenges"("request_ip_hash", "created_at");
CREATE UNIQUE INDEX "booking_notifications_idempotency_key_key" ON "booking_notifications"("idempotency_key");
CREATE INDEX "booking_notifications_status_available_at_idx" ON "booking_notifications"("status", "available_at");
CREATE INDEX "booking_notifications_booking_id_created_at_idx" ON "booking_notifications"("booking_id", "created_at");

ALTER TABLE "booking_access_challenges"
ADD CONSTRAINT "booking_access_challenges_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_notifications"
ADD CONSTRAINT "booking_notifications_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
