ALTER TABLE "trades"
ADD COLUMN "account_currency_snapshot" TEXT;

UPDATE "trades" AS t
SET "account_currency_snapshot" = UPPER(TRIM(a."currency"))
FROM "accounts" AS a
WHERE a."id" = t."account_id"
  AND t."account_currency_snapshot" IS NULL;

CREATE INDEX "trades_user_id_account_currency_snapshot_trade_date_idx"
ON "trades" ("user_id", "account_currency_snapshot", "trade_date" DESC)
WHERE "deleted_at" IS NULL;
