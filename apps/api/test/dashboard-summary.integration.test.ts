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

test("dashboard summary stays numeric after creating a trade", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `dt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
        profit: 125.5,
        result: "Win",
        notes: "Decimal regression coverage",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/dashboard/summary",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(summaryResponse.statusCode, 200);

    const payload = summaryResponse.json();

    assert.equal(typeof payload.summary.totalProfit, "number");
    assert.equal(typeof payload.summary.winRate, "number");
    assert.equal(typeof payload.recentTrades[0]?.profit, "number");
    assert.equal(typeof payload.recentTrades[0]?.entry, "number");
    assert.equal(typeof payload.recentTrades[0]?.stopLoss, "number");
    assert.equal(typeof payload.recentTrades[0]?.takeProfit, "number");
    assert.equal(typeof payload.equityCurve[0]?.profit, "number");
    assert.equal(typeof payload.equityCurve[0]?.equity, "number");
    assert.equal(payload.summary.totalProfit, 125.5);
    assert.equal(payload.summary.totalTrades, 1);
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
