ALTER TABLE "setups"
ADD COLUMN "name_normalized" TEXT;

ALTER TABLE "reviews"
ADD COLUMN "daily_scope_date" DATE,
ADD COLUMN "weekly_scope_start" DATE;

UPDATE "setups"
SET "name_normalized" = lower(btrim("name"))
WHERE "name_normalized" IS NULL;

UPDATE "reviews"
SET
  "daily_scope_date" = CASE
    WHEN "type" = 'daily' THEN "review_date"
    ELSE NULL
  END,
  "weekly_scope_start" = CASE
    WHEN "type" = 'weekly' THEN "week_start"
    ELSE NULL
  END
WHERE "daily_scope_date" IS NULL
   OR "weekly_scope_start" IS NULL;

ALTER TABLE "setups"
ALTER COLUMN "name_normalized" SET NOT NULL;

ALTER TABLE "setups"
ADD CONSTRAINT "setups_user_id_name_normalized_key"
UNIQUE ("user_id", "name_normalized");

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_user_id_daily_scope_date_key"
UNIQUE ("user_id", "daily_scope_date");

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_user_id_weekly_scope_start_key"
UNIQUE ("user_id", "weekly_scope_start");
