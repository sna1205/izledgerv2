ALTER TABLE "trades"
ADD COLUMN "pnl_currency" TEXT,
ADD COLUMN "fx_rate_snapshot" DECIMAL(18, 8),
ADD COLUMN "fx_rate_source" TEXT,
ADD COLUMN "fx_rate_timestamp" TIMESTAMPTZ(3);

UPDATE "trades"
SET "pnl_currency" = "account_currency_snapshot"
WHERE "pnl_currency" IS NULL
  AND "account_currency_snapshot" IS NOT NULL;

UPDATE "trades"
SET "fx_rate_snapshot" = 1
WHERE "fx_rate_snapshot" IS NULL
  AND "account_currency_snapshot" IS NOT NULL
  AND "pnl_currency" = "account_currency_snapshot";

UPDATE "trades"
SET "fx_rate_source" = 'account_currency_snapshot_backfill'
WHERE "fx_rate_source" IS NULL
  AND "account_currency_snapshot" IS NOT NULL
  AND "pnl_currency" = "account_currency_snapshot";

UPDATE "trades"
SET "fx_rate_timestamp" = COALESCE("closed_at", "opened_at", "created_at" AT TIME ZONE 'UTC')
WHERE "fx_rate_timestamp" IS NULL
  AND "account_currency_snapshot" IS NOT NULL;

CREATE INDEX "trades_user_id_account_currency_snapshot_pnl_currency_idx"
ON "trades" ("user_id", "account_currency_snapshot", "pnl_currency");

CREATE INDEX "trades_user_id_fx_rate_timestamp_idx"
ON "trades" ("user_id", "fx_rate_timestamp");
