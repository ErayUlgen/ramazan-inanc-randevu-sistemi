-- Kapora adımı kaldırılırken doğrulamasını tamamlamış ancak ödeme beklediği
-- için HOLD durumunda kalmış randevuları normal yönetici onay kuyruğuna taşı.
UPDATE "bookings" AS booking
SET
  "status" = 'PENDING_APPROVAL',
  "hold_expires_at" = NULL,
  "hold_token_hash" = NULL,
  "updated_at" = CURRENT_TIMESTAMP
FROM "payment_intents" AS payment
WHERE payment."booking_id" = booking."id"
  AND payment."status" = 'PENDING'
  AND booking."status" = 'HOLD';

-- Artık kullanılmayan kapora bildirimlerini, kurallarını ve ödeme kayıtlarını
-- ilişkisel bütünlüğü koruyan sırayla kaldır.
DELETE FROM "booking_notifications"
WHERE "event_type" IN ('DEPOSIT_PENDING', 'DEPOSIT_EXPIRED');

DELETE FROM "notification_rules"
WHERE "event_type" IN ('DEPOSIT_PENDING', 'DEPOSIT_EXPIRED');

DROP TABLE "payment_transactions";
DROP TABLE "payment_intents";
DROP TABLE "deposit_policies";

DROP TYPE "PaymentTransactionType";
DROP TYPE "PaymentIntentStatus";
DROP TYPE "PaymentProviderType";
DROP TYPE "DepositPolicyType";

-- PostgreSQL enum değerleri doğrudan silinemediği için bildirim enumunu
-- kapora olayları olmadan güvenli biçimde yeniden oluştur.
ALTER TYPE "NotificationEventType" RENAME TO "NotificationEventType_old";

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
  'ATTENDANCE_CONFIRMATION_REQUESTED',
  'ATTENDANCE_CONFIRMED',
  'ATTENDANCE_DECLINED',
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

DROP TYPE "NotificationEventType_old";
