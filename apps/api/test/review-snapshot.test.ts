import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const { hydrateTradeSnapshot } = await import("../src/modules/reviews/service.js");

test("review snapshot hydration converts stored storage keys when building a response", async () => {
  const snapshot = await hydrateTradeSnapshot({
    id: "trade-1",
    date: "2026-03-16",
    pair: "EURUSD",
    direction: "Buy",
    entry: 1.1,
    stopLoss: 1,
    takeProfit: 1.2,
    profit: 100,
    result: "Win",
    setup: "Breakout",
    session: "London",
    emotion: "Calm",
    notes: "Test snapshot",
    screenshots: ["users/user-1/trades/trade-1/chart.png"],
  });

  assert.deepEqual(snapshot, {
    id: "trade-1",
    date: "2026-03-16",
    pair: "EURUSD",
    direction: "Buy",
    entry: 1.1,
    stopLoss: 1,
    takeProfit: 1.2,
    profit: 100,
    result: "Win",
    setup: "Breakout",
    session: "London",
    emotion: "Calm",
    notes: "Test snapshot",
    screenshots: [""],
  });
});

test("review snapshot hydration preserves legacy signed URLs", async () => {
  const url = "https://example.com/signed-url";
  const snapshot = await hydrateTradeSnapshot({
    screenshots: [url],
  });

  assert.deepEqual(snapshot, {
    screenshots: [url],
  });
});
