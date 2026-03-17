CREATE TABLE "trade_shares" (
  "id" UUID NOT NULL,
  "trade_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "share_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3),
  "share_settings" JSONB NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trade_shares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_shares_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trade_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "trade_shares_share_id_key" ON "trade_shares" ("share_id");
CREATE UNIQUE INDEX "trade_shares_trade_id_user_id_key" ON "trade_shares" ("trade_id", "user_id");
CREATE INDEX "trade_shares_user_id_trade_id_idx" ON "trade_shares" ("user_id", "trade_id");
CREATE INDEX "trade_shares_share_id_is_active_idx" ON "trade_shares" ("share_id", "is_active");
