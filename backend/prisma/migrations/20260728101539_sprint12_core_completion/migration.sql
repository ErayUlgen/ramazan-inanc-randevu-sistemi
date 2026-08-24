-- CreateEnum
CREATE TYPE "FormTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ConsentRecordType" AS ENUM ('NOTICE_VIEWED', 'TRANSACTIONAL_ACKNOWLEDGEMENT', 'MARKETING_OPT_IN', 'MARKETING_OPT_OUT');

-- CreateEnum
CREATE TYPE "DepositPolicyType" AS ENUM ('NONE', 'FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('DEVELOPMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'WAIVED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('PAYMENT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CalendarSubscriptionScope" AS ENUM ('BRANCH', 'PROFESSIONAL');

-- AlterTable
ALTER TABLE "booking_notifications" ADD COLUMN     "notification_rule_id" TEXT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "override_by_admin_user_id" TEXT,
ADD COLUMN     "override_reason" TEXT,
ADD COLUMN     "schedule_override" BOOLEAN NOT NULL DEFAULT false;

-- Online rezervasyonlarda çakışma koruması sürer; yalnız yetkili yöneticinin
-- açık gerekçeyle işaretlediği istisnalar bu veritabanı kuralının dışındadır.
ALTER TABLE "bookings"
DROP CONSTRAINT IF EXISTS "booking_no_overlap";

ALTER TABLE "bookings"
ADD CONSTRAINT "booking_no_overlap"
EXCLUDE USING GIST (
    "professional_id" WITH =,
    tsrange("start_at", "end_at", '[)') WITH &&
)
WHERE (
    "status" IN ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED')
    AND "source" = 'ONLINE'
    AND "schedule_override" = false
);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "merged_at" TIMESTAMP(3),
ADD COLUMN     "merged_into_id" TEXT;

-- AlterTable
ALTER TABLE "operational_audit_events" ADD COLUMN     "actor_label" TEXT,
ADD COLUMN     "admin_user_id" TEXT,
ADD COLUMN     "request_ip_hash" TEXT;

-- AlterTable
ALTER TABLE "professional_services" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "customer_care_profiles" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "preferred_professional_id" TEXT,
    "preferred_service_id" TEXT,
    "style_preferences" TEXT,
    "avoid_products" TEXT,
    "customer_reported_sensitivities" TEXT,
    "communication_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_care_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'neutral',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tag_assignments" (
    "customer_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY ("customer_id","tag_id")
);

-- CreateTable
CREATE TABLE "customer_service_records" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "service_id" TEXT,
    "professional_id" TEXT,
    "created_by_admin_user_id" TEXT NOT NULL,
    "current_revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_service_record_revisions" (
    "id" TEXT NOT NULL,
    "service_record_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "technique" TEXT,
    "formula_note" TEXT,
    "product_note" TEXT,
    "result_note" TEXT,
    "next_visit_recommendation" TEXT,
    "created_by_admin_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_service_record_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FormTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_template_versions" (
    "id" TEXT NOT NULL,
    "form_template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_form_requirements" (
    "service_id" TEXT NOT NULL,
    "form_template_id" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_form_requirements_pkey" PRIMARY KEY ("service_id","form_template_id")
);

-- CreateTable
CREATE TABLE "booking_form_submissions" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "form_template_version_id" TEXT NOT NULL,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "answers" JSONB,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_admin_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "ConsentRecordType" NOT NULL,
    "document_key" TEXT NOT NULL,
    "document_version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "request_ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_policies" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "service_id" TEXT,
    "type" "DepositPolicyType" NOT NULL DEFAULT 'NONE',
    "fixed_amount_kurus" INTEGER,
    "percentage" INTEGER,
    "payment_ttl_minutes" INTEGER NOT NULL DEFAULT 15,
    "provider" "PaymentProviderType" NOT NULL DEFAULT 'MANUAL',
    "refund_on_admin_rejection" BOOLEAN NOT NULL DEFAULT true,
    "refund_on_customer_cancellation" BOOLEAN NOT NULL DEFAULT false,
    "transfer_on_reschedule" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "provider" "PaymentProviderType" NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "amount_kurus" INTEGER NOT NULL,
    "paid_amount_kurus" INTEGER NOT NULL DEFAULT 0,
    "refunded_amount_kurus" INTEGER NOT NULL DEFAULT 0,
    "client_secret_hash" TEXT,
    "provider_reference" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "waived_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "payment_intent_id" TEXT NOT NULL,
    "type" "PaymentTransactionType" NOT NULL,
    "amount_kurus" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "provider_reference" TEXT,
    "note" TEXT,
    "created_by_admin_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "event_type" "NotificationEventType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'SMS',
    "lead_minutes" INTEGER,
    "message_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_subscriptions" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "scope" "CalendarSubscriptionScope" NOT NULL,
    "label" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_admin_user_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_merge_records" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "source_customer_id" TEXT NOT NULL,
    "target_customer_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by_admin_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_merge_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_care_profiles_customer_id_key" ON "customer_care_profiles"("customer_id");

-- CreateIndex
CREATE INDEX "customer_care_profiles_branch_id_updated_at_idx" ON "customer_care_profiles"("branch_id", "updated_at");

-- CreateIndex
CREATE INDEX "customer_tags_branch_id_is_active_name_idx" ON "customer_tags"("branch_id", "is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_branch_id_name_key" ON "customer_tags"("branch_id", "name");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_tag_id_created_at_idx" ON "customer_tag_assignments"("tag_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_service_records_branch_id_customer_id_created_at_idx" ON "customer_service_records"("branch_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_service_records_booking_id_idx" ON "customer_service_records"("booking_id");

-- CreateIndex
CREATE INDEX "customer_service_records_professional_id_created_at_idx" ON "customer_service_records"("professional_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_service_record_revisions_created_by_admin_user_id__idx" ON "customer_service_record_revisions"("created_by_admin_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_service_record_revisions_service_record_id_revisio_key" ON "customer_service_record_revisions"("service_record_id", "revision");

-- CreateIndex
CREATE INDEX "form_templates_branch_id_status_updated_at_idx" ON "form_templates"("branch_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "form_template_versions_form_template_id_published_at_idx" ON "form_template_versions"("form_template_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "form_template_versions_form_template_id_version_key" ON "form_template_versions"("form_template_id", "version");

-- CreateIndex
CREATE INDEX "service_form_requirements_form_template_id_idx" ON "service_form_requirements"("form_template_id");

-- CreateIndex
CREATE INDEX "booking_form_submissions_branch_id_status_created_at_idx" ON "booking_form_submissions"("branch_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "booking_form_submissions_customer_id_created_at_idx" ON "booking_form_submissions"("customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_form_submissions_booking_id_form_template_version_i_key" ON "booking_form_submissions"("booking_id", "form_template_version_id");

-- CreateIndex
CREATE INDEX "consent_records_branch_id_customer_id_type_created_at_idx" ON "consent_records"("branch_id", "customer_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "deposit_policies_branch_id_service_id_is_active_idx" ON "deposit_policies"("branch_id", "service_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_booking_id_key" ON "payment_intents"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_client_secret_hash_key" ON "payment_intents"("client_secret_hash");

-- CreateIndex
CREATE INDEX "payment_intents_branch_id_status_created_at_idx" ON "payment_intents"("branch_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "payment_intents_customer_id_created_at_idx" ON "payment_intents"("customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_idempotency_key_key" ON "payment_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_transactions_payment_intent_id_created_at_idx" ON "payment_transactions"("payment_intent_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_rules_branch_id_event_type_is_active_idx" ON "notification_rules"("branch_id", "event_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_subscriptions_token_hash_key" ON "calendar_subscriptions"("token_hash");

-- CreateIndex
CREATE INDEX "calendar_subscriptions_branch_id_revoked_at_created_at_idx" ON "calendar_subscriptions"("branch_id", "revoked_at", "created_at");

-- CreateIndex
CREATE INDEX "calendar_subscriptions_professional_id_revoked_at_idx" ON "calendar_subscriptions"("professional_id", "revoked_at");

-- CreateIndex
CREATE INDEX "customer_merge_records_branch_id_created_at_idx" ON "customer_merge_records"("branch_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_merge_records_source_customer_id_idx" ON "customer_merge_records"("source_customer_id");

-- CreateIndex
CREATE INDEX "customer_merge_records_target_customer_id_idx" ON "customer_merge_records"("target_customer_id");

-- CreateIndex
CREATE INDEX "customers_merged_into_id_idx" ON "customers"("merged_into_id");

-- CreateIndex
CREATE INDEX "operational_audit_events_admin_user_id_created_at_idx" ON "operational_audit_events"("admin_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_override_by_admin_user_id_fkey" FOREIGN KEY ("override_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_notifications" ADD CONSTRAINT "booking_notifications_notification_rule_id_fkey" FOREIGN KEY ("notification_rule_id") REFERENCES "notification_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_audit_events" ADD CONSTRAINT "operational_audit_events_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_care_profiles" ADD CONSTRAINT "customer_care_profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_care_profiles" ADD CONSTRAINT "customer_care_profiles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_care_profiles" ADD CONSTRAINT "customer_care_profiles_preferred_professional_id_fkey" FOREIGN KEY ("preferred_professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_care_profiles" ADD CONSTRAINT "customer_care_profiles_preferred_service_id_fkey" FOREIGN KEY ("preferred_service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "customer_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_records" ADD CONSTRAINT "customer_service_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_records" ADD CONSTRAINT "customer_service_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_records" ADD CONSTRAINT "customer_service_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_records" ADD CONSTRAINT "customer_service_records_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_records" ADD CONSTRAINT "customer_service_records_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_records" ADD CONSTRAINT "customer_service_records_created_by_admin_user_id_fkey" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_record_revisions" ADD CONSTRAINT "customer_service_record_revisions_service_record_id_fkey" FOREIGN KEY ("service_record_id") REFERENCES "customer_service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_record_revisions" ADD CONSTRAINT "customer_service_record_revisions_created_by_admin_user_id_fkey" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_template_versions" ADD CONSTRAINT "form_template_versions_form_template_id_fkey" FOREIGN KEY ("form_template_id") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_form_requirements" ADD CONSTRAINT "service_form_requirements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_form_requirements" ADD CONSTRAINT "service_form_requirements_form_template_id_fkey" FOREIGN KEY ("form_template_id") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_form_submissions" ADD CONSTRAINT "booking_form_submissions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_form_submissions" ADD CONSTRAINT "booking_form_submissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_form_submissions" ADD CONSTRAINT "booking_form_submissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_form_submissions" ADD CONSTRAINT "booking_form_submissions_form_template_version_id_fkey" FOREIGN KEY ("form_template_version_id") REFERENCES "form_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_form_submissions" ADD CONSTRAINT "booking_form_submissions_reviewed_by_admin_user_id_fkey" FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_policies" ADD CONSTRAINT "deposit_policies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_policies" ADD CONSTRAINT "deposit_policies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_created_by_admin_user_id_fkey" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_subscriptions" ADD CONSTRAINT "calendar_subscriptions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_subscriptions" ADD CONSTRAINT "calendar_subscriptions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_subscriptions" ADD CONSTRAINT "calendar_subscriptions_created_by_admin_user_id_fkey" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_merge_records" ADD CONSTRAINT "customer_merge_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_merge_records" ADD CONSTRAINT "customer_merge_records_source_customer_id_fkey" FOREIGN KEY ("source_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_merge_records" ADD CONSTRAINT "customer_merge_records_target_customer_id_fkey" FOREIGN KEY ("target_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "booking_change_occupancy_segments_professional_id_start_at_end_" RENAME TO "booking_change_occupancy_segments_professional_id_start_at__idx";

-- RenameIndex
ALTER INDEX "professional_weekly_intervals_schedule_id_start_minute_end_minu" RENAME TO "professional_weekly_intervals_schedule_id_start_minute_end__key";

-- RenameIndex
ALTER INDEX "waitlist_offer_occupancy_segments_professional_id_start_at_end_" RENAME TO "waitlist_offer_occupancy_segments_professional_id_start_at__idx";
