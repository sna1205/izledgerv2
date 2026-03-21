import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/utils/errors.js";
import {
  parseStoredTradeShareSettings,
  parseStoredTradeShareSnapshot,
  serializeTradeShareSettings,
  serializeTradeShareSnapshot,
} from "../src/modules/trade-shares/storage.js";

test("trade share settings storage supports versioned and legacy payloads", () => {
  const versioned = serializeTradeShareSettings({
    showPnl: false,
    showAccountName: true,
    showNotes: false,
    showScreenshots: true,
    showExactPrices: false,
  });

  assert.deepEqual(parseStoredTradeShareSettings(versioned), {
    showPnl: false,
    showAccountName: true,
    showNotes: false,
    showScreenshots: true,
    showExactPrices: false,
  });

  assert.deepEqual(
    parseStoredTradeShareSettings({
      showPnl: true,
      showNotes: false,
    }),
    {
      showPnl: true,
      showAccountName: false,
      showNotes: false,
      showScreenshots: true,
      showExactPrices: true,
    },
  );
});

test("trade share snapshot storage supports versioned and legacy payloads", () => {
  const versioned = serializeTradeShareSnapshot({
    tradeId: "11111111-1111-4111-8111-111111111111",
    pair: "XAUUSD",
    direction: "Buy",
    result: "Win",
    date: "2026-03-21",
    entry: 3000,
    stopLoss: 2990,
    takeProfit: 3020,
    pnl: 200,
    rr: 2,
    setup: "Breakout",
    session: "London",
    emotion: "Focused",
    notes: "Stored snapshot",
    accountName: "Main",
    screenshots: [{ storageKey: "users/u/trades/t/1.png", sortOrder: 0 }],
  });

  assert.deepEqual(parseStoredTradeShareSnapshot(versioned), {
    tradeId: "11111111-1111-4111-8111-111111111111",
    pair: "XAUUSD",
    direction: "Buy",
    result: "Win",
    date: "2026-03-21",
    entry: 3000,
    stopLoss: 2990,
    takeProfit: 3020,
    pnl: 200,
    rr: 2,
    setup: "Breakout",
    session: "London",
    emotion: "Focused",
    notes: "Stored snapshot",
    accountName: "Main",
    screenshots: [{ storageKey: "users/u/trades/t/1.png", sortOrder: 0 }],
  });

  assert.deepEqual(
    parseStoredTradeShareSnapshot({
      tradeId: "22222222-2222-4222-8222-222222222222",
      pair: "EURUSD",
      direction: "Sell",
      result: "Loss",
      date: "2026-03-20",
      entry: 1.092,
      stopLoss: 1.094,
      takeProfit: 1.088,
      pnl: -50,
      screenshots: ["users/u/trades/t/legacy.png"],
    }),
    {
      tradeId: "22222222-2222-4222-8222-222222222222",
      pair: "EURUSD",
      direction: "Sell",
      result: "Loss",
      date: "2026-03-20",
      entry: 1.092,
      stopLoss: 1.094,
      takeProfit: 1.088,
      pnl: -50,
      rr: 2,
      setup: null,
      session: null,
      emotion: null,
      notes: null,
      accountName: null,
      screenshots: [{ storageKey: "users/u/trades/t/legacy.png", sortOrder: 0 }],
    },
  );
});

test("trade share snapshot parsing fails with a controlled error for malformed payloads", () => {
  assert.throws(
    () => parseStoredTradeShareSnapshot({
      tradeId: "not-a-uuid",
      pair: "XAUUSD",
    }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 410);
      assert.equal(error.code, "TRADE_SHARE_UNAVAILABLE");
      return true;
    },
  );
});
