CREATE TYPE "CustomerAuthPurpose" AS ENUM ('ACCOUNT_LOGIN', 'BOOKING_CONFIRMATION');

ALTER TABLE "customers"
  ADD COLUMN "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "last_login_at" TIMESTAMP(3);

CREATE TABLE "customer_auth_challenges" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT,
  "phone_hash" TEXT NOT NULL,
  "request_ip_hash" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "purpose" "CustomerAuthPurpose" NOT NULL,
  "subject_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_auth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_sessions" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "ip_hash" TEXT,
  "user_agent_hash" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_auth_challenges_phone_hash_created_at_idx"
  ON "customer_auth_challenges"("phone_hash", "created_at");
CREATE INDEX "customer_auth_challenges_request_ip_hash_created_at_idx"
  ON "customer_auth_challenges"("request_ip_hash", "created_at");
CREATE INDEX "customer_auth_challenges_purpose_subject_id_created_at_idx"
  ON "customer_auth_challenges"("purpose", "subject_id", "created_at");
CREATE UNIQUE INDEX "customer_sessions_token_hash_key"
  ON "customer_sessions"("token_hash");
CREATE INDEX "customer_sessions_customer_id_revoked_at_expires_at_idx"
  ON "customer_sessions"("customer_id", "revoked_at", "expires_at");

ALTER TABLE "customer_auth_challenges"
  ADD CONSTRAINT "customer_auth_challenges_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_sessions"
  ADD CONSTRAINT "customer_sessions_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
