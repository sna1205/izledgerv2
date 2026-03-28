UPDATE "trades"
SET "pair" = UPPER(REGEXP_REPLACE(BTRIM("pair"), '\s+', '', 'g'))
WHERE "pair" <> UPPER(REGEXP_REPLACE(BTRIM("pair"), '\s+', '', 'g'));

ALTER TABLE "trades"
ADD CONSTRAINT "trades_pair_normalized_chk"
CHECK (
  BTRIM("pair") <> ''
  AND "pair" = UPPER(REGEXP_REPLACE(BTRIM("pair"), '\s+', '', 'g'))
) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_pair_normalized_chk";

CREATE INDEX "trades_user_id_deleted_at_pair_trade_date_idx"
ON "trades" ("user_id", "deleted_at", "pair", "trade_date" DESC);
