-- Proposal only. Do not apply blindly.
--
-- Goal:
-- 1. Detect existing rows that would violate the new numeric rules.
-- 2. Add CHECK constraints as NOT VALID so new writes are protected immediately.
-- 3. Clean up existing bad rows.
-- 4. VALIDATE CONSTRAINT in a later release window.
--
-- These bounds align with the hardened API validation:
-- accounts.balance: 0 .. 999999999999.99
-- trades.entry:     > 0 and <= 1000000000
-- trades.stop_loss: > 0 and <= 1000000000
-- trades.take_profit: > 0 and <= 1000000000
-- trades.profit:    -999999999999.99 .. 999999999999.99

-- ---------------------------------------------------------------------------
-- Preflight: find rows that must be cleaned up before VALIDATE CONSTRAINT
-- ---------------------------------------------------------------------------

SELECT id, user_id, balance
FROM accounts
WHERE balance < 0
   OR balance > 999999999999.99;

SELECT id, user_id, deleted_at, entry, stop_loss, take_profit, profit
FROM trades
WHERE entry <= 0
   OR entry > 1000000000
   OR stop_loss <= 0
   OR stop_loss > 1000000000
   OR take_profit <= 0
   OR take_profit > 1000000000
   OR profit < -999999999999.99
   OR profit > 999999999999.99;

-- Optional summary counts for rollout dashboards
SELECT COUNT(*) AS invalid_account_balance_rows
FROM accounts
WHERE balance < 0
   OR balance > 999999999999.99;

SELECT COUNT(*) AS invalid_trade_numeric_rows
FROM trades
WHERE entry <= 0
   OR entry > 1000000000
   OR stop_loss <= 0
   OR stop_loss > 1000000000
   OR take_profit <= 0
   OR take_profit > 1000000000
   OR profit < -999999999999.99
   OR profit > 999999999999.99;

-- ---------------------------------------------------------------------------
-- Phase 1: add constraints as NOT VALID
-- New writes are checked immediately, existing rows are not blocked yet.
-- ---------------------------------------------------------------------------

ALTER TABLE accounts
ADD CONSTRAINT accounts_balance_range_chk
CHECK (balance >= 0 AND balance <= 999999999999.99)
NOT VALID;

ALTER TABLE trades
ADD CONSTRAINT trades_entry_range_chk
CHECK (entry > 0 AND entry <= 1000000000)
NOT VALID;

ALTER TABLE trades
ADD CONSTRAINT trades_stop_loss_range_chk
CHECK (stop_loss > 0 AND stop_loss <= 1000000000)
NOT VALID;

ALTER TABLE trades
ADD CONSTRAINT trades_take_profit_range_chk
CHECK (take_profit > 0 AND take_profit <= 1000000000)
NOT VALID;

ALTER TABLE trades
ADD CONSTRAINT trades_profit_range_chk
CHECK (profit >= -999999999999.99 AND profit <= 999999999999.99)
NOT VALID;

-- ---------------------------------------------------------------------------
-- Cleanup guidance
-- ---------------------------------------------------------------------------
--
-- 1. Accounts with negative or extreme balances:
--    - Correct from source-of-truth if known.
--    - If not known, quarantine them for manual review before validation.
--
-- 2. Trades with non-positive prices or extreme values:
--    - Correct from broker/import source where possible.
--    - If the row is unrecoverable, decide explicitly whether to:
--      a) fix to the intended values,
--      b) soft-delete and normalize the numbers anyway, or
--      c) hard-delete after business review.
--
-- Note:
-- CHECK constraints validate all existing rows when VALIDATE CONSTRAINT runs,
-- including soft-deleted rows. If historical soft-deleted rows are invalid,
-- they still need cleanup before validation.

-- ---------------------------------------------------------------------------
-- Phase 2: validate after cleanup
-- Run only after the preflight queries return zero rows.
-- ---------------------------------------------------------------------------

-- ALTER TABLE accounts VALIDATE CONSTRAINT accounts_balance_range_chk;
-- ALTER TABLE trades VALIDATE CONSTRAINT trades_entry_range_chk;
-- ALTER TABLE trades VALIDATE CONSTRAINT trades_stop_loss_range_chk;
-- ALTER TABLE trades VALIDATE CONSTRAINT trades_take_profit_range_chk;
-- ALTER TABLE trades VALIDATE CONSTRAINT trades_profit_range_chk;

