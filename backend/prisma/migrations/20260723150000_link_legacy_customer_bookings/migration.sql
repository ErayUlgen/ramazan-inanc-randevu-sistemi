UPDATE "bookings" AS booking
SET "customer_id" = customer."id"
FROM "customers" AS customer
WHERE booking."customer_id" IS NULL
  AND booking."customer_phone_snapshot" = customer."phone";
