import assert from "node:assert/strict";
import test from "node:test";
import { createAccountViaApi } from "./helpers.js";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.APP_URL ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

test("screenshot routes reject invalid MIME types and missing upload tokens", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ss${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const today = new Date().toISOString().slice(0, 10);

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username,
        password,
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie);

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
        notes: "Screenshot validation regression",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const invalidMimeResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/screenshots/presign`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        fileName: "chart.svg",
        contentType: "image/svg+xml",
        fileSize: 1024,
        sortOrder: 0,
      },
    });

    assert.equal(invalidMimeResponse.statusCode, 400);
    const invalidMimePayload = invalidMimeResponse.json();
    assert.equal(invalidMimePayload.error.code, "VALIDATION_ERROR");

    const invalidExtensionResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/screenshots/presign`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        fileName: "chart.png",
        contentType: "image/jpeg",
        fileSize: 1024,
        sortOrder: 0,
      },
    });

    assert.equal(invalidExtensionResponse.statusCode, 400);
    const invalidExtensionPayload = invalidExtensionResponse.json();
    assert.equal(invalidExtensionPayload.error.code, "VALIDATION_ERROR");
    assert.equal(invalidExtensionPayload.error.message, "Invalid request");
    assert.ok(invalidExtensionPayload.error.details.some((detail: { field?: string }) => detail.field === "fileName"));

    const oversizedFileResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/screenshots/presign`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        fileName: "chart.png",
        contentType: "image/png",
        fileSize: 10 * 1024 * 1024 + 1,
        sortOrder: 0,
      },
    });

    assert.equal(oversizedFileResponse.statusCode, 400);
    const oversizedFilePayload = oversizedFileResponse.json();
    assert.equal(oversizedFilePayload.error.code, "VALIDATION_ERROR");
    assert.ok(oversizedFilePayload.error.details.some((detail: { field?: string }) => detail.field === "fileSize"));

    const missingTokenResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/screenshots/complete`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        storageKey: `users/fake/trades/${tradeId}/chart.png`,
        sortOrder: 0,
      },
    });

    assert.equal(missingTokenResponse.statusCode, 400);
    const missingTokenPayload = missingTokenResponse.json();
    assert.equal(missingTokenPayload.error.code, "VALIDATION_ERROR");
    assert.ok(missingTokenPayload.error.details.some((detail: { field?: string }) => detail.field === "uploadToken"));
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username,
      },
    });
    await prisma.$disconnect();
  }
});
