ALTER TABLE "trades"
ADD COLUMN "setup_color_snapshot" TEXT;

UPDATE "trades" AS t
SET "setup_color_snapshot" = s."color"
FROM "setups" AS s
WHERE t."setup_id" = s."id"
  AND t."setup_color_snapshot" IS NULL;
