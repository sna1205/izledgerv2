import assert from "node:assert/strict";
import test from "node:test";
import { createReviewSchema, updateReviewSchema } from "../src/modules/reviews/schemas.js";

test("review schema rejects impossible calendar dates", () => {
  assert.equal(createReviewSchema.safeParse({
    type: "daily",
    reviewDate: "2026-02-30",
  }).success, false);

  assert.equal(createReviewSchema.safeParse({
    type: "trade",
    tradeId: "11111111-1111-1111-1111-111111111111",
    reviewDate: "2026-02-31",
  }).success, false);

  assert.equal(createReviewSchema.safeParse({
    type: "weekly",
    weekStart: "2026-02-30",
    weekEnd: "2026-03-08",
  }).success, false);
});

test("review schema rejects invalid weekly review scopes", () => {
  const nonMondayStart = createReviewSchema.safeParse({
    type: "weekly",
    weekStart: "2026-03-17",
    weekEnd: "2026-03-22",
  });

  assert.equal(nonMondayStart.success, false);

  const nonSundayEnd = createReviewSchema.safeParse({
    type: "weekly",
    weekStart: "2026-03-16",
    weekEnd: "2026-03-21",
  });

  assert.equal(nonSundayEnd.success, false);

  const mismatchedWeek = createReviewSchema.safeParse({
    type: "weekly",
    weekStart: "2026-03-16",
    weekEnd: "2026-03-29",
  });

  assert.equal(mismatchedWeek.success, false);
});

test("review schema accepts valid UTC calendar review dates", () => {
  assert.equal(createReviewSchema.safeParse({
    type: "daily",
    reviewDate: "2026-02-28",
  }).success, true);

  assert.equal(createReviewSchema.safeParse({
    type: "weekly",
    weekStart: "2026-03-16",
    weekEnd: "2026-03-22",
  }).success, true);

  assert.equal(createReviewSchema.safeParse({
    type: "trade",
    tradeId: "11111111-1111-1111-1111-111111111111",
    reviewDate: "2026-03-21",
  }).success, true);
});

test("review update schema rejects impossible and invalid weekly patch dates", () => {
  assert.equal(updateReviewSchema.safeParse({
    reviewDate: "2026-02-31",
  }).success, false);

  const invalidWeeklyPatch = updateReviewSchema.safeParse({
    weekStart: "2026-03-16",
    weekEnd: "2026-03-28",
  });

  assert.equal(invalidWeeklyPatch.success, false);
});
