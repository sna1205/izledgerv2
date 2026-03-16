import assert from "node:assert/strict";
import test from "node:test";
import { createTradeSchema, listTradesQuerySchema } from "../src/modules/trades/schemas.js";

test("trade schema rejects impossible calendar dates", () => {
  const invalidTrade = createTradeSchema.safeParse({
    date: "2026-02-31",
    accountId: "11111111-1111-1111-1111-111111111111",
    pair: "EURUSD",
    direction: "Buy",
    entry: 1.1,
    stopLoss: 1,
    takeProfit: 1.2,
    profit: 100,
    result: "Win",
    notes: "",
  });

  assert.equal(invalidTrade.success, false);
});

test("trade schema accepts real ISO calendar dates", () => {
  const validTrade = createTradeSchema.safeParse({
    date: "2026-02-28",
    accountId: "11111111-1111-1111-1111-111111111111",
    pair: "EURUSD",
    direction: "Buy",
    entry: 1.1,
    stopLoss: 1,
    takeProfit: 1.2,
    profit: 100,
    result: "Win",
    notes: "",
  });

  assert.equal(validTrade.success, true);
});

test("trade list filters reject impossible date ranges", () => {
  const invalidQuery = listTradesQuerySchema.safeParse({
    dateFrom: "2026-02-31",
  });

  assert.equal(invalidQuery.success, false);
});
