ALTER TABLE "branches"
  ALTER COLUMN "arrival_lead_minutes" SET DEFAULT 15,
  ALTER COLUMN "reminder_lead_minutes" SET DEFAULT 120;

ALTER TABLE "branch_booking_policies"
  ALTER COLUMN "early_arrival_minutes" SET DEFAULT 15,
  ALTER COLUMN "reminder_lead_minutes" SET DEFAULT 120,
  ALTER COLUMN "attendance_confirmation_enabled" SET DEFAULT false,
  ALTER COLUMN "review_request_delay_minutes" SET DEFAULT 15;

UPDATE "branches"
SET
  "arrival_lead_minutes" = 15,
  "reminder_lead_minutes" = 120
WHERE "slug" = 'hair-art-ramazan-inanc-denizli';

UPDATE "branch_booking_policies" AS policy
SET
  "early_arrival_minutes" = 15,
  "reminder_lead_minutes" = 120,
  "attendance_confirmation_enabled" = false,
  "review_request_enabled" = true,
  "review_request_delay_minutes" = 15
FROM "branches" AS branch
WHERE policy."branch_id" = branch."id"
  AND branch."slug" = 'hair-art-ramazan-inanc-denizli';

UPDATE "notification_rules" AS rule
SET "lead_minutes" = 120
FROM "branches" AS branch
WHERE rule."branch_id" = branch."id"
  AND branch."slug" = 'hair-art-ramazan-inanc-denizli'
  AND rule."event_type" = 'BOOKING_REMINDER'
  AND rule."channel" = 'SMS';

UPDATE "booking_notifications" AS notification
SET
  "status" = 'SKIPPED',
  "last_error_code" = 'ATTENDANCE_FLOW_DISABLED',
  "last_error_message" = 'Katılım doğrulama adımı sadeleştirilen randevu akışından kaldırıldı.'
FROM "bookings" AS booking
JOIN "branches" AS branch ON branch."id" = booking."branch_id"
WHERE notification."booking_id" = booking."id"
  AND branch."slug" = 'hair-art-ramazan-inanc-denizli'
  AND notification."event_type" = 'ATTENDANCE_CONFIRMATION_REQUESTED'
  AND notification."status" IN ('PENDING', 'RETRY_SCHEDULED');

UPDATE "bookings" AS booking
SET
  "attendance_status" = 'NOT_REQUESTED',
  "attendance_requested_at" = NULL,
  "attendance_responded_at" = NULL,
  "attendance_response_source" = NULL,
  "attendance_token_hash" = NULL,
  "attendance_token_expires_at" = NULL
FROM "branches" AS branch
WHERE booking."branch_id" = branch."id"
  AND branch."slug" = 'hair-art-ramazan-inanc-denizli'
  AND booking."attendance_status" IN ('PENDING', 'CONFIRMED', 'DECLINED', 'EXPIRED');
