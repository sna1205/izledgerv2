import assert from "node:assert/strict";
import test from "node:test";
import { completeScreenshotSchema, presignScreenshotSchema } from "../src/modules/screenshots/schemas.js";

test("presign screenshot schema only accepts safe image MIME types", () => {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

  for (const contentType of allowedTypes) {
    const result = presignScreenshotSchema.safeParse({
      fileName: "chart.png",
      contentType,
      sortOrder: 0,
    });

    assert.equal(result.success, true);
  }

  const blocked = presignScreenshotSchema.safeParse({
    fileName: "payload.svg",
    contentType: "image/svg+xml",
    sortOrder: 0,
  });

  assert.equal(blocked.success, false);
});

test("complete screenshot schema requires uploadToken", () => {
  const missingToken = completeScreenshotSchema.safeParse({
    storageKey: "users/u/trades/t/file.png",
    sortOrder: 0,
  });
  const valid = completeScreenshotSchema.safeParse({
    storageKey: "users/u/trades/t/file.png",
    uploadToken: "signed-token",
    sortOrder: 0,
  });

  assert.equal(missingToken.success, false);
  assert.equal(valid.success, true);
});
