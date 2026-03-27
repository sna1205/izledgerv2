import crypto from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { ScreenshotCleanupAction, ScreenshotCleanupReason } from "@prisma/client";
import { createAccountViaApi } from "./helpers.js";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.APP_URL ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const [{ buildApp }, { prisma }, screenshotsReconciliation] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
  import("../src/modules/screenshots/reconciliation.js"),
]);

const {
  enqueueScreenshotCleanupTask,
  processDueScreenshotCleanupTasks,
  reconcileScreenshotStorage,
} = screenshotsReconciliation;

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

async function createAuthenticatedTrade(username: string, password: string) {
  const app = await buildApp();
  const today = new Date().toISOString().slice(0, 10);

  const registerResponse = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { username, password },
  });

  assert.equal(registerResponse.statusCode, 201);
  const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
  const createdAccount = await createAccountViaApi(app, sessionCookie);
  const account = await prisma.account.findUnique({
    where: {
      id: createdAccount.id,
    },
  });

  assert.ok(account, "Expected the created account to be persisted.");

  const createTradeResponse = await app.inject({
    method: "POST",
    url: "/trades",
    headers: {
      cookie: sessionCookie,
    },
    payload: {
      date: today,
      accountId: account.id,
      pair: "EURUSD",
      direction: "Buy",
      entry: 1.12345,
      stopLoss: 1.12,
      takeProfit: 1.13,
      profit: 15,
      result: "Win",
      notes: "Screenshot cleanup coverage",
    },
  });

  assert.equal(createTradeResponse.statusCode, 201);

  return {
    app,
    account,
    tradeId: createTradeResponse.json().trade.id as string,
    sessionCookie,
  };
}

test("screenshot delete succeeds even when object cleanup must retry later", async () => {
  await prisma.$connect();

  const username = `sc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const { app, account, tradeId, sessionCookie } = await createAuthenticatedTrade(username, password);
  const storageKey = `users/${account.userId}/trades/${tradeId}/queued-delete.png`;

  try {
    const screenshot = await prisma.tradeScreenshot.create({
      data: {
        userId: account.userId,
        tradeId,
        storageKey,
        sortOrder: 0,
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/trades/${tradeId}/screenshots/${screenshot.id}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(response.statusCode, 204);

    const deletedScreenshot = await prisma.tradeScreenshot.findUnique({
      where: { id: screenshot.id },
    });
    assert.equal(deletedScreenshot, null);

    const cleanupTask = await prisma.screenshotCleanupTask.findFirst({
      where: {
        screenshotId: screenshot.id,
      },
    });

    assert.ok(cleanupTask, "Expected screenshot delete to enqueue a cleanup task.");
    assert.equal(cleanupTask.action, "deleteObject");
    assert.equal(cleanupTask.reason, "screenshotDelete");
    assert.equal(cleanupTask.storageKey, storageKey);
    assert.equal(cleanupTask.completedAt, null);
    assert.equal(cleanupTask.attemptCount, 1);
    assert.match(cleanupTask.lastError ?? "", /Storage is disabled/i);
  } finally {
    await app.close();
    await prisma.screenshotCleanupTask.deleteMany({
      where: {
        OR: [
          { userId: account.userId },
          { storageKey },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        username,
      },
    });
    await prisma.$disconnect();
  }
});

test("screenshot delete is blocked when review or share snapshots still reference the image", async () => {
  await prisma.$connect();

  const username = `sclock${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const { app, account, tradeId, sessionCookie } = await createAuthenticatedTrade(username, password);
  const storageKey = `users/${account.userId}/trades/${tradeId}/history-lock.png`;

  try {
    const screenshot = await prisma.tradeScreenshot.create({
      data: {
        userId: account.userId,
        tradeId,
        storageKey,
        sortOrder: 0,
      },
    });

    const createShareResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/share`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        settings: {
          showPnl: true,
          showAccountName: false,
          showNotes: true,
          showScreenshots: true,
          showExactPrices: true,
        },
      },
    });

    assert.equal(createShareResponse.statusCode, 201);

    await prisma.review.create({
      data: {
        userId: account.userId,
        type: "trade",
        tradeId,
        tradeSnapshot: {
          id: tradeId,
          date: new Date().toISOString().slice(0, 10),
          pair: "EURUSD",
          direction: "Buy",
          entry: 1.12345,
          stopLoss: 1.12,
          takeProfit: 1.13,
          profit: 15,
          result: "Win",
          setup: "",
          setupColor: null,
          session: "London",
          emotion: "Calm",
          notes: "Snapshot lock coverage",
          screenshots: [storageKey],
        },
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/trades/${tradeId}/screenshots/${screenshot.id}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "SCREENSHOT_SNAPSHOT_LOCKED");

    const persistedScreenshot = await prisma.tradeScreenshot.findUnique({
      where: { id: screenshot.id },
    });

    assert.ok(persistedScreenshot, "Expected locked screenshots to remain persisted.");
  } finally {
    await app.close();
    await prisma.screenshotCleanupTask.deleteMany({
      where: {
        OR: [
          { userId: account.userId },
          { storageKey },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        username,
      },
    });
    await prisma.$disconnect();
  }
});

test("cleanup queue retries failed object deletions without losing the task", async () => {
  await prisma.$connect();

  const storageKey = `users/test-user/trades/test-trade/retry-${Date.now().toString(36)}.png`;

  try {
    const task = await enqueueScreenshotCleanupTask(prisma, {
      action: ScreenshotCleanupAction.deleteObject,
      reason: ScreenshotCleanupReason.orphanObject,
      storageKey,
    });

    const result = await processDueScreenshotCleanupTasks({
      deps: {
        isStorageEnabled: () => true,
        deleteObjectIfPresent: async () => {
          throw new Error("simulated delete failure");
        },
      },
    });

    assert.equal(result.completed, 0);
    assert.equal(result.retried, 1);

    const persistedTask = await prisma.screenshotCleanupTask.findUnique({
      where: {
        id: task.id,
      },
    });

    assert.ok(persistedTask, "Expected cleanup task to remain in the queue.");
    assert.equal(persistedTask.completedAt, null);
    assert.equal(persistedTask.attemptCount, 1);
    assert.equal(persistedTask.lastError, "simulated delete failure");
    assert.ok(persistedTask.nextAttemptAt.getTime() > Date.now());
  } finally {
    await prisma.screenshotCleanupTask.deleteMany({
      where: {
        storageKey,
      },
    });
    await prisma.$disconnect();
  }
});

test("reconciliation queues and processes expired uploads, orphaned objects, and dangling screenshot rows", async () => {
  await prisma.$connect();

  const username = `sr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const { app, account, tradeId } = await createAuthenticatedTrade(username, password);
  const danglingStorageKey = `users/${account.userId}/trades/${tradeId}/dangling.png`;
  const expiredUploadStorageKey = `users/${account.userId}/trades/${tradeId}/expired-upload.png`;
  const orphanStorageKey = `users/${account.userId}/trades/${tradeId}/orphan.png`;
  const deletedObjectKeys: string[] = [];

  try {
    const screenshot = await prisma.tradeScreenshot.create({
      data: {
        userId: account.userId,
        tradeId,
        storageKey: danglingStorageKey,
        sortOrder: 0,
      },
    });

    const upload = await prisma.tradeScreenshotUpload.create({
      data: {
        id: crypto.randomUUID(),
        userId: account.userId,
        tradeId,
        storageKey: expiredUploadStorageKey,
        fileName: "expired-upload.png",
        contentType: "image/png",
        fileSize: 1024,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const result = await reconcileScreenshotStorage({
      deps: {
        isStorageEnabled: () => true,
        objectExists: async (key: string) => key !== danglingStorageKey,
        deleteObjectIfPresent: async (key: string) => {
          deletedObjectKeys.push(key);
        },
        listObjectKeys: async () => ({
          keys: [orphanStorageKey],
          nextContinuationToken: undefined,
        }),
      },
    });

    assert.equal(result.expiredUploadResult.staleUploadsFound, 1);
    assert.equal(result.orphanedObjectsQueued, 1);
    assert.equal(result.danglingScreenshotRowsQueued, 1);
    assert.equal(result.processingResult.retried, 0);

    const deletedScreenshot = await prisma.tradeScreenshot.findUnique({
      where: { id: screenshot.id },
    });
    assert.equal(deletedScreenshot, null);

    const deletedUpload = await prisma.tradeScreenshotUpload.findUnique({
      where: { id: upload.id },
    });
    assert.equal(deletedUpload, null);

    assert.deepEqual(
      [...deletedObjectKeys].sort(),
      [expiredUploadStorageKey, orphanStorageKey].sort(),
    );
  } finally {
    await app.close();
    await prisma.screenshotCleanupTask.deleteMany({
      where: {
        OR: [
          { userId: account.userId },
          {
            storageKey: {
              in: [danglingStorageKey, expiredUploadStorageKey, orphanStorageKey],
            },
          },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        username,
      },
    });
    await prisma.$disconnect();
  }
});
