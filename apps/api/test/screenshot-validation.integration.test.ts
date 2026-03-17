import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/izledger";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

test("screenshot routes reject invalid MIME types and missing upload tokens", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

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
    const account = await prisma.account.findFirst({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    assert.ok(account, "Expected the default account created during registration.");

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
        sortOrder: 0,
      },
    });

    assert.equal(invalidMimeResponse.statusCode, 400);
    const invalidMimePayload = invalidMimeResponse.json();
    assert.equal(invalidMimePayload.error.code, "VALIDATION_ERROR");

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
    assert.ok(Array.isArray(missingTokenPayload.error.details.fieldErrors.uploadToken));
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
