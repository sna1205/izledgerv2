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

test("database numeric constraints reject invalid account balances even outside the API schema", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ndb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);

    const createAccountResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Constraint Test",
        broker: "Manual",
        type: "Personal",
        balance: "100",
        currency: "USD",
      },
    });

    assert.equal(createAccountResponse.statusCode, 201);
    const accountId = createAccountResponse.json().account.id as string;

    await assert.rejects(
      prisma.$executeRaw`UPDATE "accounts" SET "balance" = -1 WHERE "id" = ${accountId}::uuid`,
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /accounts_balance_range_chk/);
        return true;
      },
    );
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("database numeric constraints reject zero-risk or out-of-range trades even outside the API schema", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ntd${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const today = new Date().toISOString().slice(0, 10);

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
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
        entry: "1.12345",
        stopLoss: "1.12",
        takeProfit: "1.13",
        profit: "123.45",
        result: "Win",
        notes: "Constraint test",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;
    const storedTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        entry: true,
      },
    });

    assert.ok(storedTrade, "Expected created trade to exist.");

    await assert.rejects(
      prisma.$executeRaw`UPDATE "trades" SET "entry" = 0 WHERE "id" = ${tradeId}::uuid`,
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /trades_entry_range_chk/);
        return true;
      },
    );

    await assert.rejects(
      prisma.$executeRaw`
        UPDATE "trades"
        SET "stop_loss" = ${storedTrade.entry}
        WHERE "id" = ${tradeId}::uuid
      `,
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /trades_entry_stop_loss_gap_chk/);
        return true;
      },
    );
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});
