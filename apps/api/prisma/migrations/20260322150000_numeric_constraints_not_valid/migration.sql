ALTER TABLE "accounts"
ADD CONSTRAINT "accounts_balance_range_chk"
CHECK ("balance" >= 0 AND "balance" <= 999999999999.99)
NOT VALID;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_entry_range_chk"
CHECK ("entry" > 0 AND "entry" <= 1000000000)
NOT VALID;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_stop_loss_range_chk"
CHECK ("stop_loss" > 0 AND "stop_loss" <= 1000000000)
NOT VALID;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_take_profit_range_chk"
CHECK ("take_profit" > 0 AND "take_profit" <= 1000000000)
NOT VALID;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_profit_range_chk"
CHECK ("profit" >= -999999999999.99 AND "profit" <= 999999999999.99)
NOT VALID;

ALTER TABLE "trades"
ADD CONSTRAINT "trades_entry_stop_loss_gap_chk"
CHECK ("entry" <> "stop_loss")
NOT VALID;
