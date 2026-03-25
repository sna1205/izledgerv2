import assert from "node:assert/strict";
import test from "node:test";

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

test("trade creation rejects impossible calendar dates at the API boundary", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `td${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

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

    const tradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: "2026-02-31",
        accountId: account.id,
        pair: "EURUSD",
        direction: "Buy",
        entry: 1.12345,
        stopLoss: 1.12,
        takeProfit: 1.13,
        profit: 10,
        result: "Win",
        notes: "Invalid date regression",
      },
    });

    assert.equal(tradeResponse.statusCode, 400);
    const payload = tradeResponse.json();
    assert.equal(payload.error.code, "VALIDATION_ERROR");
    assert.equal(payload.error.message, "Invalid request");
    assert.deepEqual(payload.error.details, [
      {
        field: "date",
        message: "Invalid trade date",
      },
    ]);
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
