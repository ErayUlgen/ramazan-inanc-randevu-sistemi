-- AlterTable
ALTER TABLE "booking_notifications" ADD COLUMN     "recipient_phone" TEXT,
ADD COLUMN     "waitlist_entry_id" TEXT,
ADD COLUMN     "waitlist_offer_id" TEXT,
ALTER COLUMN "booking_id" DROP NOT NULL;

ALTER TABLE "booking_notifications"
ADD CONSTRAINT "booking_notifications_has_owner"
CHECK ("booking_id" IS NOT NULL OR "waitlist_entry_id" IS NOT NULL);

-- CreateIndex
CREATE INDEX "booking_notifications_waitlist_entry_id_created_at_idx" ON "booking_notifications"("waitlist_entry_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_notifications_waitlist_offer_id_created_at_idx" ON "booking_notifications"("waitlist_offer_id", "created_at");

-- AddForeignKey
ALTER TABLE "booking_notifications" ADD CONSTRAINT "booking_notifications_waitlist_entry_id_fkey" FOREIGN KEY ("waitlist_entry_id") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_notifications" ADD CONSTRAINT "booking_notifications_waitlist_offer_id_fkey" FOREIGN KEY ("waitlist_offer_id") REFERENCES "waitlist_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
