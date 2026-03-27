CREATE INDEX "trades_user_id_deleted_at_trade_date_created_at_idx"
ON "trades" ("user_id", "deleted_at", "trade_date" DESC, "created_at" DESC);
