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

test("account deletion is blocked when only soft-deleted trades remain", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

  const app = await buildApp();
  const username = `ad${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
    const defaultAccount = await prisma.account.findFirst({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    assert.ok(defaultAccount, "Expected the default account created during registration.");

    const createAccountResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Delete Target",
        broker: "Manual",
        type: "Personal",
        balance: 1000,
        currency: "USD",
      },
    });

    assert.equal(createAccountResponse.statusCode, 201);

    const targetAccountId = createAccountResponse.json().account.id as string;

    const createTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: today,
        accountId: targetAccountId,
        pair: "GBPUSD",
        direction: "Sell",
        entry: 1.2745,
        stopLoss: 1.28,
        takeProfit: 1.26,
        profit: -42.5,
        result: "Loss",
        notes: "Soft delete account protection",
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

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: `/accounts/${targetAccountId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteAccountResponse.statusCode, 409);
    const payload = deleteAccountResponse.json();
    assert.equal(payload.error.code, "ACCOUNT_IN_USE");
    assert.equal(payload.error.message, "Account cannot be deleted while trades exist.");

    const stillExists = await prisma.account.findUnique({
      where: {
        id: targetAccountId,
      },
    });

    assert.ok(stillExists, "Expected account to remain when soft-deleted trades exist.");
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
