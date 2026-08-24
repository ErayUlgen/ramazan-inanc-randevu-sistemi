-- Repair the replacement character that entered one demo service name and
-- the immutable booking-item snapshots created from it. The update is
-- intentionally scoped to the exact known label so unrelated user data stays
-- untouched.
UPDATE "services"
SET "name" = 'Anatomik Saç Kesimi',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'Anatomik Sa' || chr(65533) || ' Kesimi';

UPDATE "booking_items"
SET "service_name" = 'Anatomik Saç Kesimi'
WHERE "service_name" = 'Anatomik Sa' || chr(65533) || ' Kesimi';
