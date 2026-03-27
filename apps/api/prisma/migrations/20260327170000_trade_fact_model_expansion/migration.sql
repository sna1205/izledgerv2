ALTER TABLE "trades"
ADD COLUMN "quantity" DECIMAL(20, 8),
ADD COLUMN "lot_size" DECIMAL(20, 8),
ADD COLUMN "exit_price" DECIMAL(18, 8),
ADD COLUMN "fees" DECIMAL(18, 2),
ADD COLUMN "risk_amount" DECIMAL(18, 2),
ADD COLUMN "risk_percent" DECIMAL(7, 4),
ADD COLUMN "gross_pnl" DECIMAL(18, 2),
ADD COLUMN "net_pnl" DECIMAL(18, 2);

UPDATE "trades"
SET "net_pnl" = "profit"
WHERE "net_pnl" IS NULL;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_quantity_positive_chk"
CHECK ("quantity" IS NULL OR "quantity" > 0) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_quantity_positive_chk";

ALTER TABLE "trades"
ADD CONSTRAINT "trades_lot_size_positive_chk"
CHECK ("lot_size" IS NULL OR "lot_size" > 0) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_lot_size_positive_chk";

ALTER TABLE "trades"
ADD CONSTRAINT "trades_exit_price_positive_chk"
CHECK ("exit_price" IS NULL OR "exit_price" > 0) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_exit_price_positive_chk";

ALTER TABLE "trades"
ADD CONSTRAINT "trades_fees_nonnegative_chk"
CHECK ("fees" IS NULL OR "fees" >= 0) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_fees_nonnegative_chk";

ALTER TABLE "trades"
ADD CONSTRAINT "trades_risk_amount_positive_chk"
CHECK ("risk_amount" IS NULL OR "risk_amount" > 0) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_risk_amount_positive_chk";

ALTER TABLE "trades"
ADD CONSTRAINT "trades_risk_percent_range_chk"
CHECK ("risk_percent" IS NULL OR ("risk_percent" > 0 AND "risk_percent" <= 100)) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_risk_percent_range_chk";

ALTER TABLE "trades"
ADD CONSTRAINT "trades_profit_net_pnl_sync_chk"
CHECK ("net_pnl" IS NULL OR "profit" = "net_pnl") NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_profit_net_pnl_sync_chk";

ALTER TABLE "trades"
ADD CONSTRAINT "trades_gross_net_fee_consistency_chk"
CHECK (
  "gross_pnl" IS NULL
  OR "net_pnl" IS NULL
  OR "fees" IS NULL
  OR "net_pnl" = ("gross_pnl" - "fees")
) NOT VALID;

ALTER TABLE "trades"
VALIDATE CONSTRAINT "trades_gross_net_fee_consistency_chk";
