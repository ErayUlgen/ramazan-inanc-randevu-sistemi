-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "BookingChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaitlistEntryStatus" AS ENUM ('ACTIVE', 'OFFERED', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaitlistOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'FAILED');

-- CreateEnum
CREATE TYPE "SlotRecoveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'CHANGE_REQUEST_RECEIVED';
ALTER TYPE "NotificationEventType" ADD VALUE 'CHANGE_REQUEST_APPROVED';
ALTER TYPE "NotificationEventType" ADD VALUE 'CHANGE_REQUEST_REJECTED';
ALTER TYPE "NotificationEventType" ADD VALUE 'WAITLIST_JOINED';
ALTER TYPE "NotificationEventType" ADD VALUE 'WAITLIST_OFFERED';
ALTER TYPE "NotificationEventType" ADD VALUE 'WAITLIST_OFFER_ACCEPTED';
ALTER TYPE "NotificationEventType" ADD VALUE 'WAITLIST_OFFER_EXPIRED';

-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "booking_notifications" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "provider_status" TEXT;

-- CreateTable
CREATE TABLE "branch_booking_policies" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "cancellation_lead_minutes" INTEGER NOT NULL DEFAULT 120,
    "reschedule_lead_minutes" INTEGER NOT NULL DEFAULT 180,
    "change_request_ttl_minutes" INTEGER NOT NULL DEFAULT 120,
    "waitlist_offer_ttl_minutes" INTEGER NOT NULL DEFAULT 15,
    "max_active_change_requests" INTEGER NOT NULL DEFAULT 1,
    "otp_resend_seconds" INTEGER NOT NULL DEFAULT 60,
    "otp_max_attempts" INTEGER NOT NULL DEFAULT 5,
    "early_arrival_minutes" INTEGER NOT NULL DEFAULT 10,
    "reminder_lead_minutes" INTEGER NOT NULL DEFAULT 30,
    "pending_warning_minutes" INTEGER NOT NULL DEFAULT 30,
    "allow_late_cancellation" BOOLEAN NOT NULL DEFAULT true,
    "waitlist_enabled" BOOLEAN NOT NULL DEFAULT true,
    "automatic_waitlist_offers" BOOLEAN NOT NULL DEFAULT true,
    "salon_phone" TEXT,
    "whatsapp_phone" TEXT,
    "maps_url" TEXT,
    "customer_policy_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_booking_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'OWNER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_change_requests" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "requested_professional_id" TEXT NOT NULL,
    "status" "BookingChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_start_at" TIMESTAMP(3) NOT NULL,
    "requested_end_at" TIMESTAMP(3) NOT NULL,
    "booking_revision" INTEGER NOT NULL,
    "reason" TEXT,
    "decision_reason" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "professional_id" TEXT,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "status" "WaitlistEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "failed_offer_count" INTEGER NOT NULL DEFAULT 0,
    "access_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entry_services" (
    "waitlist_entry_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "waitlist_entry_services_pkey" PRIMARY KEY ("waitlist_entry_id","service_id")
);

-- CreateTable
CREATE TABLE "waitlist_offers" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "waitlist_entry_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "accepted_booking_id" TEXT,
    "status" "WaitlistOfferStatus" NOT NULL DEFAULT 'PENDING',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_access_challenges" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "request_ip_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_access_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_recovery_events" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "professional_id" TEXT,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" "SlotRecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_recovery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_realtime_events" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_realtime_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_booking_policies_branch_id_key" ON "branch_booking_policies"("branch_id");

-- CreateIndex
CREATE INDEX "admin_users_username_is_active_idx" ON "admin_users"("username", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_branch_id_username_key" ON "admin_users"("branch_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_user_id_revoked_at_expires_at_idx" ON "admin_sessions"("admin_user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "booking_change_requests_branch_id_status_created_at_idx" ON "booking_change_requests"("branch_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "booking_change_requests_booking_id_status_idx" ON "booking_change_requests"("booking_id", "status");

-- CreateIndex
CREATE INDEX "booking_change_requests_requested_professional_id_requested_idx" ON "booking_change_requests"("requested_professional_id", "requested_start_at", "requested_end_at");

-- A booking can have only one live customer change proposal.
CREATE UNIQUE INDEX "booking_change_requests_one_pending_per_booking"
ON "booking_change_requests"("booking_id")
WHERE "status" = 'PENDING';

-- Live proposals reserve their target professional interval.
ALTER TABLE "booking_change_requests"
ADD CONSTRAINT "booking_change_requests_no_pending_overlap"
EXCLUDE USING gist (
  "requested_professional_id" WITH =,
  tsrange("requested_start_at", "requested_end_at", '[)') WITH &&
)
WHERE ("status" = 'PENDING');

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_access_token_hash_key" ON "waitlist_entries"("access_token_hash");

-- CreateIndex
CREATE INDEX "waitlist_entries_branch_id_status_date_from_date_to_idx" ON "waitlist_entries"("branch_id", "status", "date_from", "date_to");

-- CreateIndex
CREATE INDEX "waitlist_entries_phone_status_idx" ON "waitlist_entries"("phone", "status");

ALTER TABLE "waitlist_entries"
ADD CONSTRAINT "waitlist_entries_valid_date_range"
CHECK ("date_from" <= "date_to");

ALTER TABLE "waitlist_entries"
ADD CONSTRAINT "waitlist_entries_valid_time_range"
CHECK (
  "start_minute" >= 0
  AND "end_minute" <= 1440
  AND "start_minute" < "end_minute"
);

-- CreateIndex
CREATE INDEX "waitlist_entry_services_service_id_idx" ON "waitlist_entry_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_offers_token_hash_key" ON "waitlist_offers"("token_hash");

-- CreateIndex
CREATE INDEX "waitlist_offers_branch_id_status_start_at_idx" ON "waitlist_offers"("branch_id", "status", "start_at");

-- CreateIndex
CREATE INDEX "waitlist_offers_professional_id_start_at_end_at_idx" ON "waitlist_offers"("professional_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "waitlist_offers_waitlist_entry_id_status_idx" ON "waitlist_offers"("waitlist_entry_id", "status");

CREATE UNIQUE INDEX "waitlist_offers_one_pending_per_entry"
ON "waitlist_offers"("waitlist_entry_id")
WHERE "status" = 'PENDING';

-- A pending offer is a real temporary capacity hold.
ALTER TABLE "waitlist_offers"
ADD CONSTRAINT "waitlist_offers_no_pending_overlap"
EXCLUDE USING gist (
  "professional_id" WITH =,
  tsrange("start_at", "end_at", '[)') WITH &&
)
WHERE ("status" = 'PENDING');

-- CreateIndex
CREATE INDEX "waitlist_access_challenges_phone_hash_created_at_idx" ON "waitlist_access_challenges"("phone_hash", "created_at");

-- CreateIndex
CREATE INDEX "waitlist_access_challenges_request_ip_hash_created_at_idx" ON "waitlist_access_challenges"("request_ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "slot_recovery_events_status_available_at_idx" ON "slot_recovery_events"("status", "available_at");

-- CreateIndex
CREATE UNIQUE INDEX "slot_recovery_events_source_type_source_id_start_at_key" ON "slot_recovery_events"("source_type", "source_id", "start_at");

-- CreateIndex
CREATE INDEX "admin_realtime_events_branch_id_created_at_idx" ON "admin_realtime_events"("branch_id", "created_at");

-- AddForeignKey
ALTER TABLE "branch_booking_policies" ADD CONSTRAINT "branch_booking_policies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_change_requests" ADD CONSTRAINT "booking_change_requests_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_change_requests" ADD CONSTRAINT "booking_change_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_change_requests" ADD CONSTRAINT "booking_change_requests_requested_professional_id_fkey" FOREIGN KEY ("requested_professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entry_services" ADD CONSTRAINT "waitlist_entry_services_waitlist_entry_id_fkey" FOREIGN KEY ("waitlist_entry_id") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entry_services" ADD CONSTRAINT "waitlist_entry_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_offers" ADD CONSTRAINT "waitlist_offers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_offers" ADD CONSTRAINT "waitlist_offers_waitlist_entry_id_fkey" FOREIGN KEY ("waitlist_entry_id") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_offers" ADD CONSTRAINT "waitlist_offers_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_offers" ADD CONSTRAINT "waitlist_offers_accepted_booking_id_fkey" FOREIGN KEY ("accepted_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_recovery_events" ADD CONSTRAINT "slot_recovery_events_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_realtime_events" ADD CONSTRAINT "admin_realtime_events_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "branch_weekly_intervals_branch_id_weekday_start_minute_end_minu" RENAME TO "branch_weekly_intervals_branch_id_weekday_start_minute_end__key";
