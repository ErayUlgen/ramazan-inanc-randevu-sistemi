ALTER TABLE "branch_booking_policies"
  ADD COLUMN "booking_window_days" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "minimum_booking_notice_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "same_day_booking_cutoff_minute" INTEGER;

ALTER TABLE "customers"
  ADD COLUMN "online_booking_blocked_at" TIMESTAMP(3),
  ADD COLUMN "online_booking_block_reason" TEXT,
  ADD COLUMN "online_booking_blocked_by_admin_user_id" TEXT;

ALTER TABLE "services"
  ADD COLUMN "pre_visit_instructions" TEXT,
  ADD COLUMN "post_visit_instructions" TEXT;

ALTER TABLE "booking_items"
  ADD COLUMN "pre_visit_instructions_snapshot" TEXT,
  ADD COLUMN "post_visit_instructions_snapshot" TEXT;

CREATE TABLE "professional_weekly_schedules" (
  "id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "is_working" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "professional_weekly_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_weekly_intervals" (
  "id" TEXT NOT NULL,
  "schedule_id" TEXT NOT NULL,
  "start_minute" INTEGER NOT NULL,
  "end_minute" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "professional_weekly_intervals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "professional_weekly_schedules_professional_id_weekday_key"
  ON "professional_weekly_schedules"("professional_id", "weekday");
CREATE INDEX "professional_weekly_schedules_professional_id_weekday_idx"
  ON "professional_weekly_schedules"("professional_id", "weekday");
CREATE UNIQUE INDEX "professional_weekly_intervals_schedule_id_start_minute_end_minute_key"
  ON "professional_weekly_intervals"("schedule_id", "start_minute", "end_minute");
CREATE INDEX "professional_weekly_intervals_schedule_id_start_minute_idx"
  ON "professional_weekly_intervals"("schedule_id", "start_minute");
CREATE INDEX "bookings_branch_id_status_start_at_id_idx"
  ON "bookings"("branch_id", "status", "start_at", "id");
CREATE INDEX "bookings_branch_id_source_start_at_id_idx"
  ON "bookings"("branch_id", "source", "start_at", "id");

ALTER TABLE "professional_weekly_schedules"
  ADD CONSTRAINT "professional_weekly_schedules_professional_id_fkey"
  FOREIGN KEY ("professional_id") REFERENCES "professionals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "professional_weekly_intervals"
  ADD CONSTRAINT "professional_weekly_intervals_schedule_id_fkey"
  FOREIGN KEY ("schedule_id") REFERENCES "professional_weekly_schedules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_online_booking_blocked_by_admin_user_id_fkey"
  FOREIGN KEY ("online_booking_blocked_by_admin_user_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "branch_booking_policies"
  ADD CONSTRAINT "branch_booking_policies_booking_window_days_check"
  CHECK ("booking_window_days" BETWEEN 1 AND 90),
  ADD CONSTRAINT "branch_booking_policies_minimum_notice_check"
  CHECK ("minimum_booking_notice_minutes" BETWEEN 0 AND 10080),
  ADD CONSTRAINT "branch_booking_policies_same_day_cutoff_check"
  CHECK ("same_day_booking_cutoff_minute" IS NULL OR "same_day_booking_cutoff_minute" BETWEEN 0 AND 1439);

ALTER TABLE "professional_weekly_schedules"
  ADD CONSTRAINT "professional_weekly_schedules_weekday_check"
  CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "professional_weekly_intervals"
  ADD CONSTRAINT "professional_weekly_intervals_minutes_check"
  CHECK ("start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute");

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_booking_block_reason_length_check"
  CHECK ("online_booking_block_reason" IS NULL OR char_length("online_booking_block_reason") <= 300);
ALTER TABLE "services"
  ADD CONSTRAINT "services_pre_visit_instructions_length_check"
  CHECK ("pre_visit_instructions" IS NULL OR char_length("pre_visit_instructions") <= 1000),
  ADD CONSTRAINT "services_post_visit_instructions_length_check"
  CHECK ("post_visit_instructions" IS NULL OR char_length("post_visit_instructions") <= 1000);
