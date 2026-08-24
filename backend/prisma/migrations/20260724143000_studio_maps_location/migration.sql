UPDATE "branch_booking_policies" AS policy
SET "maps_url" = 'https://www.google.com/maps/place//data=!4m2!3m1!1s0x14c741125ac99709:0xad2bff10cae2c3ed?sa=X&ved=1t:8290&ictx=111'
FROM "branches" AS branch
WHERE policy."branch_id" = branch."id"
  AND branch."slug" = 'hair-art-ramazan-inanc-denizli'
  AND policy."maps_url" IS NULL;
