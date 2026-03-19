ALTER TABLE "trade_screenshots"
ADD COLUMN "user_id" UUID;

UPDATE "trade_screenshots" AS "screenshots"
SET "user_id" = "trades"."user_id"
FROM "trades"
WHERE "trades"."id" = "screenshots"."trade_id";

ALTER TABLE "trade_screenshots"
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "trade_screenshots"
ADD CONSTRAINT "trade_screenshots_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "trade_screenshots_user_id_idx" ON "trade_screenshots" ("user_id");
CREATE INDEX "trade_screenshots_user_id_trade_id_idx" ON "trade_screenshots" ("user_id", "trade_id");
