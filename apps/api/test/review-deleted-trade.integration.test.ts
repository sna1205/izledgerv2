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

test("cannot create a review for a soft-deleted trade", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `rv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
        profit: 25.5,
        result: "Win",
        notes: "Review deleted trade regression",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);

    const tradeId = createTradeResponse.json().trade.id as string;

    const deleteTradeResponse = await app.inject({
      method: "DELETE",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteTradeResponse.statusCode, 204);

    const createReviewResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "trade",
        tradeId,
        lessonLearned: "Should fail for deleted trade",
      },
    });

    assert.equal(createReviewResponse.statusCode, 404);
    const payload = createReviewResponse.json();
    assert.equal(payload.error.code, "TRADE_NOT_FOUND");
    assert.equal(payload.error.message, "Linked trade not found.");
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
