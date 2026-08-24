-- Keep the database-level online overlap guarantee without treating a
-- processing/free phase as professional occupancy. New bookings use explicit
-- occupancy segments; legacy/direct inserts fall back to the booking interval.

CREATE OR REPLACE FUNCTION "enforce_online_occupancy_segment_no_overlap"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_booking "bookings"%ROWTYPE;
BEGIN
  SELECT *
  INTO current_booking
  FROM "bookings"
  WHERE "id" = NEW."booking_id";

  IF current_booking."source" <> 'ONLINE'
    OR current_booking."status" NOT IN ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED')
  THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('online-occupancy:' || NEW."professional_id")
  );

  IF EXISTS (
    SELECT 1
    FROM "booking_occupancy_segments" candidate_segment
    JOIN "bookings" candidate_booking
      ON candidate_booking."id" = candidate_segment."booking_id"
    WHERE candidate_segment."booking_id" <> NEW."booking_id"
      AND candidate_segment."professional_id" = NEW."professional_id"
      AND candidate_booking."status" IN ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED')
      AND candidate_segment."start_at" < NEW."end_at"
      AND candidate_segment."end_at" > NEW."start_at"
  ) THEN
    RAISE EXCEPTION 'online booking occupancy overlaps an active booking'
      USING ERRCODE = '23P01',
            CONSTRAINT = 'booking_occupancy_no_overlap';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "booking_occupancy_no_overlap"
AFTER INSERT OR UPDATE ON "booking_occupancy_segments"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "enforce_online_occupancy_segment_no_overlap"();

CREATE OR REPLACE FUNCTION "enforce_legacy_online_booking_no_overlap"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."source" <> 'ONLINE'
    OR NEW."status" NOT IN ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED')
  THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('online-occupancy:' || NEW."professional_id")
  );

  -- Segment-aware bookings are validated by the constraint trigger above.
  IF EXISTS (
    SELECT 1
    FROM "booking_occupancy_segments"
    WHERE "booking_id" = NEW."id"
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "bookings" candidate
    WHERE candidate."id" <> NEW."id"
      AND candidate."professional_id" = NEW."professional_id"
      AND candidate."status" IN ('HOLD', 'PENDING_APPROVAL', 'CONFIRMED')
      AND (
        (
          EXISTS (
            SELECT 1
            FROM "booking_occupancy_segments" candidate_segment
            WHERE candidate_segment."booking_id" = candidate."id"
          )
          AND EXISTS (
            SELECT 1
            FROM "booking_occupancy_segments" candidate_segment
            WHERE candidate_segment."booking_id" = candidate."id"
              AND candidate_segment."start_at" < NEW."end_at"
              AND candidate_segment."end_at" > NEW."start_at"
          )
        )
        OR (
          NOT EXISTS (
            SELECT 1
            FROM "booking_occupancy_segments" candidate_segment
            WHERE candidate_segment."booking_id" = candidate."id"
          )
          AND candidate."start_at" < NEW."end_at"
          AND candidate."end_at" > NEW."start_at"
        )
      )
  ) THEN
    RAISE EXCEPTION 'online booking overlaps an active booking'
      USING ERRCODE = '23P01',
            CONSTRAINT = 'booking_no_overlap';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "booking_legacy_no_overlap"
AFTER INSERT OR UPDATE ON "bookings"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "enforce_legacy_online_booking_no_overlap"();
