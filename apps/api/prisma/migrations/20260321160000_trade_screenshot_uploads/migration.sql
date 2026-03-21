CREATE TABLE "trade_screenshot_uploads" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "trade_id" UUID NOT NULL,
  "storage_key" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_screenshot_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_screenshot_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trade_screenshot_uploads_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "trade_screenshot_uploads_storage_key_key" ON "trade_screenshot_uploads" ("storage_key");
CREATE INDEX "trade_screenshot_uploads_user_id_trade_id_idx" ON "trade_screenshot_uploads" ("user_id", "trade_id");
CREATE INDEX "trade_screenshot_uploads_trade_id_created_at_idx" ON "trade_screenshot_uploads" ("trade_id", "created_at");
CREATE INDEX "trade_screenshot_uploads_expires_at_idx" ON "trade_screenshot_uploads" ("expires_at");
