CREATE INDEX IF NOT EXISTS "idx_active_trades_user"
ON "trades" ("user_id", "trade_date" DESC)
WHERE "deleted_at" IS NULL;
