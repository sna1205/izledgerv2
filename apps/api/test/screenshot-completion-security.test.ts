import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPendingScreenshotUploadIsCompletable,
  assertTradeStorageKey,
  assertUploadedScreenshotObjectMatchesToken,
} from "../src/modules/screenshots/service.js";
import { AppError } from "../src/utils/errors.js";

const now = Date.now();

const tokenPayload = {
  uploadId: "11111111-1111-1111-1111-111111111111",
  userId: "user-1",
  tradeId: "trade-1",
  storageKey: "users/user-1/trades/trade-1/chart.png",
  fileName: "chart.png",
  contentType: "image/png",
  fileSize: 1024,
  expiresAt: now + 60_000,
};

const pendingUpload = {
  id: tokenPayload.uploadId,
  userId: tokenPayload.userId,
  tradeId: tokenPayload.tradeId,
  storageKey: tokenPayload.storageKey,
  fileName: tokenPayload.fileName,
  contentType: tokenPayload.contentType,
  fileSize: tokenPayload.fileSize,
  expiresAt: new Date(tokenPayload.expiresAt),
  completedAt: null,
};

test("pending screenshot upload validation accepts a matching unused upload", () => {
  assert.doesNotThrow(() => {
    assertPendingScreenshotUploadIsCompletable(pendingUpload, tokenPayload, {
      userId: tokenPayload.userId,
      tradeId: tokenPayload.tradeId,
      storageKey: tokenPayload.storageKey,
      now,
    });
  });
});

test("pending screenshot upload validation rejects reuse", () => {
  assert.throws(() => {
    assertPendingScreenshotUploadIsCompletable({
      ...pendingUpload,
      completedAt: new Date(now - 1_000),
    }, tokenPayload, {
      userId: tokenPayload.userId,
      tradeId: tokenPayload.tradeId,
      storageKey: tokenPayload.storageKey,
      now,
    });
  }, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "SCREENSHOT_UPLOAD_ALREADY_COMPLETED");
    return true;
  });
});

test("pending screenshot upload validation rejects completion without presign", () => {
  assert.throws(() => {
    assertPendingScreenshotUploadIsCompletable(null, tokenPayload, {
      userId: tokenPayload.userId,
      tradeId: tokenPayload.tradeId,
      storageKey: tokenPayload.storageKey,
      now,
    });
  }, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "INVALID_UPLOAD_TOKEN");
    return true;
  });
});

test("pending screenshot upload validation rejects expired or mismatched uploads", () => {
  for (const upload of [
    {
      ...pendingUpload,
      expiresAt: new Date(now - 1_000),
    },
    {
      ...pendingUpload,
      storageKey: "users/user-1/trades/trade-2/chart.png",
    },
    {
      ...pendingUpload,
      userId: "user-2",
    },
  ]) {
    assert.throws(() => {
      assertPendingScreenshotUploadIsCompletable(upload, tokenPayload, {
        userId: tokenPayload.userId,
        tradeId: tokenPayload.tradeId,
        storageKey: tokenPayload.storageKey,
        now,
      });
    }, (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "INVALID_UPLOAD_TOKEN");
      return true;
    });
  }
});

test("storage key validation rejects keys outside the user trade prefix", () => {
  assert.throws(() => {
    assertTradeStorageKey("user-1", "trade-1", "users/user-2/trades/trade-1/chart.png");
  }, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "INVALID_STORAGE_KEY");
    return true;
  });
});

test("uploaded screenshot metadata validation rejects invalid MIME and oversized files", () => {
  for (const uploadedObject of [
    {
      exists: true,
      contentType: "image/jpeg",
      contentLength: tokenPayload.fileSize,
    },
    {
      exists: true,
      contentType: "image/png",
      contentLength: 10 * 1024 * 1024 + 1,
    },
  ]) {
    assert.throws(() => {
      assertUploadedScreenshotObjectMatchesToken(uploadedObject, tokenPayload);
    }, (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "SCREENSHOT_UPLOAD_INVALID");
      return true;
    });
  }
});

test("valid screenshot upload completion checks pass with mocked storage metadata", () => {
  assert.doesNotThrow(() => {
    assertTradeStorageKey("user-1", "trade-1", tokenPayload.storageKey);
    assertPendingScreenshotUploadIsCompletable(pendingUpload, tokenPayload, {
      userId: tokenPayload.userId,
      tradeId: tokenPayload.tradeId,
      storageKey: tokenPayload.storageKey,
      now,
    });
    assertUploadedScreenshotObjectMatchesToken({
      exists: true,
      contentType: "image/png",
      contentLength: tokenPayload.fileSize,
    }, tokenPayload);
  });
});
