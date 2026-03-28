ALTER TABLE "trade_checklist_responses"
ADD COLUMN "user_id" UUID;

UPDATE "trade_checklist_responses" AS "responses"
SET "user_id" = "trades"."user_id"
FROM "trades"
WHERE "trades"."id" = "responses"."trade_id"
  AND "responses"."user_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "trades" t
    INNER JOIN "accounts" a
      ON a."id" = t."account_id"
    WHERE a."user_id" <> t."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: trades.account_id points at an account owned by another user.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trades" t
    INNER JOIN "setups" s
      ON s."id" = t."setup_id"
    WHERE s."user_id" <> t."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: trades.setup_id points at a setup owned by another user.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trade_screenshots" s
    INNER JOIN "trades" t
      ON t."id" = s."trade_id"
    WHERE s."user_id" <> t."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: trade_screenshots.user_id does not match the referenced trade owner.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trade_screenshot_uploads" u
    INNER JOIN "trades" t
      ON t."id" = u."trade_id"
    WHERE u."user_id" <> t."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: trade_screenshot_uploads.user_id does not match the referenced trade owner.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trade_shares" s
    INNER JOIN "trades" t
      ON t."id" = s."trade_id"
    WHERE s."user_id" <> t."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: trade_shares.user_id does not match the referenced trade owner.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "reviews" r
    INNER JOIN "trades" t
      ON t."id" = r."trade_id"
    WHERE r."user_id" <> t."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: reviews.user_id does not match the referenced trade owner.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trade_checklist_responses" r
    INNER JOIN "trades" t
      ON t."id" = r."trade_id"
    WHERE r."user_id" IS NULL
       OR r."user_id" <> t."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: trade_checklist_responses.user_id is missing or does not match the referenced trade owner.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trade_checklist_responses" r
    INNER JOIN "checklist_rules" cr
      ON cr."id" = r."checklist_rule_id"
    WHERE r."user_id" <> cr."user_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ownership FK: trade_checklist_responses.user_id does not match the referenced checklist rule owner.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION ensure_trade_checklist_response_rule_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."checklist_rule_id" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "checklist_rules" cr
    WHERE cr."id" = NEW."checklist_rule_id"
      AND cr."user_id" = NEW."user_id"
  ) THEN
    RAISE EXCEPTION 'trade_checklist_responses.checklist_rule_id must belong to the same user as trade_checklist_responses.user_id.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "trade_checklist_responses"
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "trade_checklist_responses"
ADD CONSTRAINT "trade_checklist_responses_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
NOT VALID;

CREATE UNIQUE INDEX "accounts_id_user_id_key"
ON "accounts" ("id", "user_id");

CREATE UNIQUE INDEX "setups_id_user_id_key"
ON "setups" ("id", "user_id");

CREATE UNIQUE INDEX "trades_id_user_id_key"
ON "trades" ("id", "user_id");

CREATE UNIQUE INDEX "checklist_rules_id_user_id_key"
ON "checklist_rules" ("id", "user_id");

CREATE INDEX "trade_checklist_responses_user_id_trade_id_idx"
ON "trade_checklist_responses" ("user_id", "trade_id");

CREATE TRIGGER "trg_trade_checklist_responses_rule_ownership"
BEFORE INSERT OR UPDATE ON "trade_checklist_responses"
FOR EACH ROW
EXECUTE FUNCTION ensure_trade_checklist_response_rule_ownership();

ALTER TABLE "trades"
ADD CONSTRAINT "trades_account_id_user_id_fkey"
FOREIGN KEY ("account_id", "user_id")
REFERENCES "accounts" ("id", "user_id")
ON DELETE RESTRICT ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_setup_id_user_id_fkey"
FOREIGN KEY ("setup_id", "user_id")
REFERENCES "setups" ("id", "user_id")
ON DELETE NO ACTION ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "trade_screenshots"
ADD CONSTRAINT "trade_screenshots_trade_id_user_id_fkey"
FOREIGN KEY ("trade_id", "user_id")
REFERENCES "trades" ("id", "user_id")
ON DELETE CASCADE ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "trade_screenshot_uploads"
ADD CONSTRAINT "trade_screenshot_uploads_trade_id_user_id_fkey"
FOREIGN KEY ("trade_id", "user_id")
REFERENCES "trades" ("id", "user_id")
ON DELETE CASCADE ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "trade_shares"
ADD CONSTRAINT "trade_shares_trade_id_user_id_fkey"
FOREIGN KEY ("trade_id", "user_id")
REFERENCES "trades" ("id", "user_id")
ON DELETE CASCADE ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_trade_id_user_id_fkey"
FOREIGN KEY ("trade_id", "user_id")
REFERENCES "trades" ("id", "user_id")
ON DELETE NO ACTION ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "trade_checklist_responses"
ADD CONSTRAINT "trade_checklist_responses_trade_id_user_id_fkey"
FOREIGN KEY ("trade_id", "user_id")
REFERENCES "trades" ("id", "user_id")
ON DELETE CASCADE ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "trade_checklist_responses"
VALIDATE CONSTRAINT "trade_checklist_responses_user_id_fkey";

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_account_id_user_id_fkey";

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_setup_id_user_id_fkey";

ALTER TABLE "trade_screenshots"
VALIDATE CONSTRAINT "trade_screenshots_trade_id_user_id_fkey";

ALTER TABLE "trade_screenshot_uploads"
VALIDATE CONSTRAINT "trade_screenshot_uploads_trade_id_user_id_fkey";

ALTER TABLE "trade_shares"
VALIDATE CONSTRAINT "trade_shares_trade_id_user_id_fkey";

ALTER TABLE "reviews"
VALIDATE CONSTRAINT "reviews_trade_id_user_id_fkey";

ALTER TABLE "trade_checklist_responses"
VALIDATE CONSTRAINT "trade_checklist_responses_trade_id_user_id_fkey";
