ALTER TABLE "branch_booking_policies"
  ALTER COLUMN "automatic_waitlist_offers" SET DEFAULT FALSE;

UPDATE "branch_booking_policies"
SET "automatic_waitlist_offers" = FALSE
WHERE "automatic_waitlist_offers" = TRUE;

UPDATE "slot_recovery_events"
SET
  "status" = 'PENDING',
  "available_at" = NOW(),
  "last_error" = NULL
WHERE "status" = 'PROCESSING';
