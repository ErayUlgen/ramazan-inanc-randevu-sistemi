-- Manuel salon kayıtları yönetici iradesiyle çalışma saati dışında veya mevcut
-- bir randevunun üzerine eklenebilir. Online akıştaki eşzamanlı çakışma koruması
-- veritabanı seviyesinde devam eder.
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
);
