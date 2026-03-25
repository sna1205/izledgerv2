DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "accounts"
    WHERE "balance" < 0
       OR "balance" > 999999999999.99
  ) THEN
    RAISE NOTICE 'Skipping VALIDATE CONSTRAINT accounts_balance_range_chk because invalid account balances still exist.';
  ELSE
    EXECUTE 'ALTER TABLE "accounts" VALIDATE CONSTRAINT "accounts_balance_range_chk"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trades"
    WHERE "entry" <= 0
       OR "entry" > 1000000000
  ) THEN
    RAISE NOTICE 'Skipping VALIDATE CONSTRAINT trades_entry_range_chk because invalid trade entry values still exist.';
  ELSE
    EXECUTE 'ALTER TABLE "trades" VALIDATE CONSTRAINT "trades_entry_range_chk"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trades"
    WHERE "stop_loss" <= 0
       OR "stop_loss" > 1000000000
  ) THEN
    RAISE NOTICE 'Skipping VALIDATE CONSTRAINT trades_stop_loss_range_chk because invalid trade stop loss values still exist.';
  ELSE
    EXECUTE 'ALTER TABLE "trades" VALIDATE CONSTRAINT "trades_stop_loss_range_chk"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trades"
    WHERE "take_profit" <= 0
       OR "take_profit" > 1000000000
  ) THEN
    RAISE NOTICE 'Skipping VALIDATE CONSTRAINT trades_take_profit_range_chk because invalid trade take profit values still exist.';
  ELSE
    EXECUTE 'ALTER TABLE "trades" VALIDATE CONSTRAINT "trades_take_profit_range_chk"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trades"
    WHERE "profit" < -999999999999.99
       OR "profit" > 999999999999.99
  ) THEN
    RAISE NOTICE 'Skipping VALIDATE CONSTRAINT trades_profit_range_chk because invalid trade profit values still exist.';
  ELSE
    EXECUTE 'ALTER TABLE "trades" VALIDATE CONSTRAINT "trades_profit_range_chk"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trades"
    WHERE "entry" = "stop_loss"
  ) THEN
    RAISE NOTICE 'Skipping VALIDATE CONSTRAINT trades_entry_stop_loss_gap_chk because zero-risk trades still exist.';
  ELSE
    EXECUTE 'ALTER TABLE "trades" VALIDATE CONSTRAINT "trades_entry_stop_loss_gap_chk"';
  END IF;
END $$;
