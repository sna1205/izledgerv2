import assert from "node:assert/strict";
import test from "node:test";
import { completeScreenshotSchema, presignScreenshotSchema } from "../src/modules/screenshots/schemas.js";
import { maxScreenshotFileSizeBytes } from "../src/modules/screenshots/constants.js";

test("presign screenshot schema only accepts safe image MIME types", () => {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

  for (const contentType of allowedTypes) {
    const result = presignScreenshotSchema.safeParse({
      fileName: "chart.png",
      contentType,
      fileSize: 1024,
      sortOrder: 0,
    });

    assert.equal(result.success, true);
  }

  const blocked = presignScreenshotSchema.safeParse({
    fileName: "payload.svg",
    contentType: "image/svg+xml",
    fileSize: 1024,
    sortOrder: 0,
  });

  assert.equal(blocked.success, false);
});

test("presign screenshot schema requires matching file extension and bounded file size", () => {
  const invalidExtension = presignScreenshotSchema.safeParse({
    fileName: "chart.png",
    contentType: "image/jpeg",
    fileSize: 1024,
    sortOrder: 0,
  });

  const missingExtension = presignScreenshotSchema.safeParse({
    fileName: "chart",
    contentType: "image/png",
    fileSize: 1024,
    sortOrder: 0,
  });

  const tooLarge = presignScreenshotSchema.safeParse({
    fileName: "chart.webp",
    contentType: "image/webp",
    fileSize: maxScreenshotFileSizeBytes + 1,
    sortOrder: 0,
  });

  assert.equal(invalidExtension.success, false);
  assert.equal(missingExtension.success, false);
  assert.equal(tooLarge.success, false);
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
