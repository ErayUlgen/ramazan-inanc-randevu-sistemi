-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ONLINE', 'ADMIN', 'WALK_IN');

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "opening_minute" INTEGER NOT NULL DEFAULT 600,
    "closing_minute" INTEGER NOT NULL DEFAULT 1260,
    "arrival_lead_minutes" INTEGER NOT NULL DEFAULT 10,
    "reminder_lead_minutes" INTEGER NOT NULL DEFAULT 30,
    "requires_booking_approval" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Anatomik Saç Kesim Uzmanı',
    "bio" TEXT,
    "is_online_bookable" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_kurus" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_services" (
    "professional_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,

    CONSTRAINT "professional_services_pkey" PRIMARY KEY ("professional_id","service_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "public_code" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'HOLD',
    "source" "BookingSource" NOT NULL DEFAULT 'ONLINE',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "total_duration_minutes" INTEGER NOT NULL,
    "total_price_kurus" INTEGER NOT NULL,
    "hold_expires_at" TIMESTAMP(3),
    "hold_token_hash" TEXT,
    "customer_note" TEXT,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_kurus" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_slug_key" ON "branches"("slug");

-- CreateIndex
CREATE INDEX "professionals_branch_id_is_online_bookable_idx" ON "professionals"("branch_id", "is_online_bookable");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_branch_id_slug_key" ON "professionals"("branch_id", "slug");

-- CreateIndex
CREATE INDEX "services_branch_id_category_is_active_idx" ON "services"("branch_id", "category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "services_branch_id_slug_key" ON "services"("branch_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_public_code_key" ON "bookings"("public_code");

-- CreateIndex
CREATE INDEX "bookings_branch_id_start_at_status_idx" ON "bookings"("branch_id", "start_at", "status");

-- CreateIndex
CREATE INDEX "bookings_professional_id_start_at_end_at_idx" ON "bookings"("professional_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "bookings_customer_id_created_at_idx" ON "bookings"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_items_booking_id_sort_order_idx" ON "booking_items"("booking_id", "sort_order");

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Aynı uzmana ait aktif zaman aralıklarının veritabanı seviyesinde çakışmasını engeller.
-- [) yarı açık aralığı sayesinde 10:00-11:00 randevusundan sonra 11:00'de yeni randevu başlayabilir.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

ALTER TABLE "bookings"
ADD CONSTRAINT "booking_no_overlap"
EXCLUDE USING GIST (
    "professional_id" WITH =,
    tsrange("start_at", "end_at", '[)') WITH &&
)
WHERE ("status" IN ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED'));
