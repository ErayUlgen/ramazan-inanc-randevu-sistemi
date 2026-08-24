UPDATE "services"
SET "category" = 'Erkek Hizmetleri'
WHERE "slug" = 'sac-yikama-sekillendirme'
  AND "category" = 'Bakım & Şekillendirme';

UPDATE "branch_booking_policies" AS policy
SET "salon_phone" = '+905442631902'
FROM "branches" AS branch
WHERE policy."branch_id" = branch."id"
  AND branch."slug" = 'hair-art-ramazan-inanc-denizli'
  AND policy."salon_phone" IS NULL;
