import assert from "node:assert/strict";
import test from "node:test";
import { createAccountSchema } from "../src/modules/accounts/schemas.js";
import { createReviewSchema, listReviewsQuerySchema } from "../src/modules/reviews/schemas.js";
import { completeScreenshotSchema, presignScreenshotSchema } from "../src/modules/screenshots/schemas.js";
import { createTradeSchema, listTradesQuerySchema } from "../src/modules/trades/schemas.js";

const validTrade = {
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
};

test("account schema rejects negative, infinite, and unrealistic balances", () => {
  assert.equal(createAccountSchema.safeParse({
    name: "Main",
    broker: "Broker",
    type: "Personal",
    balance: 0,
    currency: "USD",
  }).success, true);

  assert.equal(createAccountSchema.safeParse({
    name: "Main",
    broker: "Broker",
    type: "Personal",
    balance: -1,
    currency: "USD",
  }).success, false);

  assert.equal(createAccountSchema.safeParse({
    name: "Main",
    broker: "Broker",
    type: "Personal",
    balance: Infinity,
    currency: "USD",
  }).success, false);

  assert.equal(createAccountSchema.safeParse({
    name: "Main",
    broker: "Broker",
    type: "Personal",
    balance: 1_000_000_000_000,
    currency: "USD",
  }).success, false);
});

test("trade schema rejects non-finite and unrealistic numeric values", () => {
  assert.equal(createTradeSchema.safeParse(validTrade).success, true);

  assert.equal(createTradeSchema.safeParse({
    ...validTrade,
    entry: Infinity,
  }).success, false);

  assert.equal(createTradeSchema.safeParse({
    ...validTrade,
    stopLoss: -1,
  }).success, false);

  assert.equal(createTradeSchema.safeParse({
    ...validTrade,
    takeProfit: 1_000_000_001,
  }).success, false);

  assert.equal(createTradeSchema.safeParse({
    ...validTrade,
    profit: -1_000_000_000_000,
  }).success, false);
});

test("trade list pagination rejects non-finite and oversized values", () => {
  assert.equal(listTradesQuerySchema.safeParse({
    page: 1,
    pageSize: 100,
  }).success, true);

  assert.equal(listTradesQuerySchema.safeParse({
    page: Infinity,
  }).success, false);

  assert.equal(listTradesQuerySchema.safeParse({
    page: 10_001,
  }).success, false);

  assert.equal(listTradesQuerySchema.safeParse({
    pageSize: 101,
  }).success, false);
});

test("review numeric fields reject non-finite values and out-of-range scores", () => {
  assert.equal(createReviewSchema.safeParse({
    type: "daily",
    reviewDate: "2026-02-28",
    disciplineScore: 10,
  }).success, true);

  assert.equal(createReviewSchema.safeParse({
    type: "daily",
    reviewDate: "2026-02-28",
    disciplineScore: Infinity,
  }).success, false);

  assert.equal(createReviewSchema.safeParse({
    type: "trade",
    tradeId: "11111111-1111-1111-1111-111111111111",
    executionRating: 6,
  }).success, false);

  assert.equal(listReviewsQuerySchema.safeParse({
    page: 10_001,
  }).success, false);
});

test("screenshot sort order rejects non-finite and oversized values", () => {
  assert.equal(presignScreenshotSchema.safeParse({
    fileName: "chart.png",
    contentType: "image/png",
    fileSize: 1024,
    sortOrder: 1_000,
  }).success, true);

  assert.equal(presignScreenshotSchema.safeParse({
    fileName: "chart.png",
    contentType: "image/png",
    fileSize: 1024,
    sortOrder: Infinity,
  }).success, false);

  assert.equal(completeScreenshotSchema.safeParse({
    storageKey: "users/u/trades/t/file.png",
    uploadToken: "signed-token",
    sortOrder: 1_001,
  }).success, false);
});
