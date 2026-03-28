ALTER TABLE "trades"
ADD COLUMN "client_request_id" TEXT,
ADD COLUMN "opened_at" TIMESTAMPTZ(3),
ADD COLUMN "closed_at" TIMESTAMPTZ(3);

UPDATE "trades"
SET "opened_at" = COALESCE("opened_at", "created_at" AT TIME ZONE 'UTC')
WHERE "opened_at" IS NULL;

UPDATE "trades"
SET "closed_at" = COALESCE("closed_at", "opened_at")
WHERE "closed_at" IS NULL;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_lifecycle_timestamp_order_chk"
CHECK (
  "opened_at" IS NULL
  OR "closed_at" IS NULL
  OR "closed_at" >= "opened_at"
) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_lifecycle_timestamp_order_chk";

CREATE INDEX "trades_user_id_client_request_id_idx"
ON "trades" ("user_id", "client_request_id");

CREATE INDEX "trades_user_id_opened_at_idx"
ON "trades" ("user_id", "opened_at");

CREATE INDEX "trades_user_id_closed_at_idx"
ON "trades" ("user_id", "closed_at");
