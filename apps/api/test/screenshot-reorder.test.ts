import assert from "node:assert/strict";
import test from "node:test";
import { isValidScreenshotReorder } from "../src/modules/screenshots/service.js";

test("screenshot reorder requires the full list with no duplicates", () => {
  const allIds = ["a", "b", "c"];

  assert.equal(isValidScreenshotReorder(allIds, ["c", "a", "b"]), true);
  assert.equal(isValidScreenshotReorder(allIds, ["a", "b"]), false);
  assert.equal(isValidScreenshotReorder(allIds, ["a", "b", "b"]), false);
  assert.equal(isValidScreenshotReorder(allIds, ["a", "b", "d"]), false);
});
