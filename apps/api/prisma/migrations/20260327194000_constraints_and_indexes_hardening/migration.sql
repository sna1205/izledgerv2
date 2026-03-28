DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "trade_checklist_responses"
    WHERE "checklist_rule_id" IS NOT NULL
    GROUP BY "trade_id", "checklist_rule_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add uniqueness: duplicate trade_checklist_responses rows exist for the same trade and checklist rule.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trade_screenshots"
    GROUP BY "trade_id", "storage_key"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add uniqueness: duplicate trade_screenshots rows exist for the same trade and storage key.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trade_screenshots"
    GROUP BY "trade_id", "sort_order"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add uniqueness: duplicate trade_screenshots sort orders exist for the same trade.';
  END IF;
END $$;

CREATE UNIQUE INDEX "trade_checklist_responses_trade_id_checklist_rule_id_key"
ON "trade_checklist_responses" ("trade_id", "checklist_rule_id")
WHERE "checklist_rule_id" IS NOT NULL;

ALTER TABLE "accounts"
ADD CONSTRAINT "accounts_not_archived_default_chk"
CHECK (NOT ("is_default" AND "is_archived")) NOT VALID;

ALTER TABLE "accounts"
VALIDATE CONSTRAINT "accounts_not_archived_default_chk";

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_scope_type_consistency_chk"
CHECK (
  ("type" = 'trade' AND "trade_id" IS NOT NULL AND "daily_scope_date" IS NULL AND "weekly_scope_start" IS NULL)
  OR ("type" = 'daily' AND "trade_id" IS NULL AND "daily_scope_date" IS NOT NULL AND "weekly_scope_start" IS NULL AND "review_date" IS NOT NULL)
  OR ("type" = 'weekly' AND "trade_id" IS NULL AND "daily_scope_date" IS NULL AND "weekly_scope_start" IS NOT NULL AND "week_start" IS NOT NULL AND "week_end" IS NOT NULL)
) NOT VALID;

ALTER TABLE "reviews"
VALIDATE CONSTRAINT "reviews_scope_type_consistency_chk";

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_discipline_score_range_chk"
CHECK (
  "discipline_score" IS NULL
  OR ("type" = 'trade' AND "discipline_score" BETWEEN 1 AND 5)
  OR ("type" = 'daily' AND "discipline_score" BETWEEN 1 AND 10)
) NOT VALID;

ALTER TABLE "reviews"
VALIDATE CONSTRAINT "reviews_discipline_score_range_chk";

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_weekly_rating_range_chk"
CHECK ("weekly_rating" IS NULL OR "weekly_rating" BETWEEN 1 AND 10) NOT VALID;

ALTER TABLE "reviews"
VALIDATE CONSTRAINT "reviews_weekly_rating_range_chk";

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_execution_rating_range_chk"
CHECK ("execution_rating" IS NULL OR "execution_rating" BETWEEN 1 AND 5) NOT VALID;

ALTER TABLE "reviews"
VALIDATE CONSTRAINT "reviews_execution_rating_range_chk";

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_emotion_rating_range_chk"
CHECK ("emotion_rating" IS NULL OR "emotion_rating" BETWEEN 1 AND 5) NOT VALID;

ALTER TABLE "reviews"
VALIDATE CONSTRAINT "reviews_emotion_rating_range_chk";

CREATE UNIQUE INDEX "trade_screenshots_trade_id_storage_key_key"
ON "trade_screenshots" ("trade_id", "storage_key");

CREATE UNIQUE INDEX "trade_screenshots_trade_id_sort_order_key"
ON "trade_screenshots" ("trade_id", "sort_order");

CREATE INDEX "trades_user_id_deleted_at_account_id_trade_date_idx"
ON "trades" ("user_id", "deleted_at", "account_id", "trade_date" DESC);

CREATE INDEX "trades_user_id_deleted_at_setup_id_trade_date_idx"
ON "trades" ("user_id", "deleted_at", "setup_id", "trade_date" DESC);

CREATE INDEX "trade_screenshot_uploads_completed_at_expires_at_idx"
ON "trade_screenshot_uploads" ("completed_at", "expires_at");

CREATE INDEX "reviews_user_id_review_date_idx"
ON "reviews" ("user_id", "review_date" DESC);

CREATE INDEX "reviews_user_id_week_end_idx"
ON "reviews" ("user_id", "week_end" DESC);
