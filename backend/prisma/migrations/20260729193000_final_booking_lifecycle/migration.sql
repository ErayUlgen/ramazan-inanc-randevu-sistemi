-- Remove the retired customer attendance-confirmation flow without touching
-- bookings, reviews or operational audit history.
DELETE FROM "booking_notifications"
WHERE "event_type" IN (
  'ATTENDANCE_CONFIRMATION_REQUESTED',
  'ATTENDANCE_CONFIRMED',
  'ATTENDANCE_DECLINED'
);

DELETE FROM "notification_rules"
WHERE "event_type" IN (
  'ATTENDANCE_CONFIRMATION_REQUESTED',
  'ATTENDANCE_CONFIRMED',
  'ATTENDANCE_DECLINED'
);

ALTER TABLE "bookings"
  DROP COLUMN "attendance_status",
  DROP COLUMN "attendance_requested_at",
  DROP COLUMN "attendance_responded_at",
  DROP COLUMN "attendance_response_source",
  DROP COLUMN "attendance_token_hash",
  DROP COLUMN "attendance_token_expires_at";

ALTER TABLE "branch_booking_policies"
  DROP COLUMN "attendance_confirmation_enabled",
  DROP COLUMN "attendance_confirmation_lead_minutes",
  DROP COLUMN "attendance_confirmation_minimum_notice_minutes",
  ALTER COLUMN "review_request_delay_minutes" SET DEFAULT 30,
  ALTER COLUMN "review_request_expiry_days" SET DEFAULT 30;

UPDATE "branch_booking_policies"
SET
  "review_request_delay_minutes" = 30,
  "review_request_expiry_days" = 30;

ALTER TYPE "NotificationEventType" RENAME TO "NotificationEventType_legacy";

CREATE TYPE "NotificationEventType" AS ENUM (
  'BOOKING_RECEIVED',
  'BOOKING_APPROVED',
  'BOOKING_REJECTED',
  'BOOKING_CANCELLED',
  'BOOKING_CREATED_BY_ADMIN',
  'BOOKING_RESCHEDULED',
  'BOOKING_REMINDER',
  'CHANGE_REQUEST_RECEIVED',
  'CHANGE_REQUEST_APPROVED',
  'CHANGE_REQUEST_REJECTED',
  'WAITLIST_JOINED',
  'WAITLIST_OFFERED',
  'WAITLIST_OFFER_ACCEPTED',
  'WAITLIST_OFFER_EXPIRED',
  'REVIEW_REQUESTED',
  'REVIEW_SUBMITTED',
  'FORM_PENDING'
);

ALTER TABLE "booking_notifications"
  ALTER COLUMN "event_type" TYPE "NotificationEventType"
  USING ("event_type"::text::"NotificationEventType");

ALTER TABLE "notification_rules"
  ALTER COLUMN "event_type" TYPE "NotificationEventType"
  USING ("event_type"::text::"NotificationEventType");

DROP TYPE "NotificationEventType_legacy";
DROP TYPE "AttendanceResponseSource";
DROP TYPE "AttendanceStatus";
