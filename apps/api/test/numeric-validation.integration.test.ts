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

function assertValidationError(response: { statusCode: number; json: () => any }, fields: string[]) {
  assert.equal(response.statusCode, 400);

  const payload = response.json();
  assert.deepEqual(Object.keys(payload), ["error"]);
  assert.equal(payload.error.code, "VALIDATION_ERROR");
  assert.equal(payload.error.message, "Invalid request");
  assert.ok(Array.isArray(payload.error.details));

  for (const field of fields) {
    assert.ok(
      payload.error.details.some((detail: { field?: string; message?: string }) => detail.field === field && typeof detail.message === "string"),
      `Expected validation errors for ${field}.`,
    );
  }
}

test("numeric validation accepts decimal strings and rejects invalid account balance payloads", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `nvb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
    const validBalanceResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Decimal Balance",
        broker: "Manual",
        type: "Personal",
        balance: "123.45",
        currency: "USD",
      },
    });

    assert.equal(validBalanceResponse.statusCode, 201);
    assert.equal(validBalanceResponse.json().account.balance, 123.45);

    for (const balance of ["Infinity", "-Infinity", "NaN", "1000000000000", "-1"]) {
      const invalidBalanceResponse = await app.inject({
        method: "POST",
        url: "/accounts",
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          name: "Invalid Balance",
          broker: "Manual",
          type: "Personal",
          balance,
          currency: "USD",
        },
      });

      assertValidationError(invalidBalanceResponse, ["balance"]);
    }
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

test("numeric validation rejects invalid trade payloads and pagination query params", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `nvt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

    const invalidTradeCases: Array<{ field: string; value: string }> = [
      { field: "entry", value: "0" },
      { field: "stopLoss", value: "-1" },
      { field: "takeProfit", value: "1000000001" },
      { field: "profit", value: "-1000000000000" },
    ];

    for (const invalidCase of invalidTradeCases) {
      const invalidTradeResponse = await app.inject({
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
          notes: "Numeric validation regression",
          [invalidCase.field]: invalidCase.value,
        },
      });

      assertValidationError(invalidTradeResponse, [invalidCase.field]);
    }

    const invalidTradesQueryResponse = await app.inject({
      method: "GET",
      url: "/trades?page=Infinity&pageSize=101",
      headers: {
        cookie: sessionCookie,
      },
    });

    assertValidationError(invalidTradesQueryResponse, ["page", "pageSize"]);
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

test("numeric validation rejects invalid review and screenshot numeric payloads", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `nvr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
        pair: "GBPUSD",
        direction: "Sell",
        entry: "1.2745",
        stopLoss: "1.28",
        takeProfit: "1.26",
        profit: "-42.5",
        result: "Loss",
        notes: "Numeric validation follow-up",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const invalidReviewResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "trade",
        tradeId,
        executionRating: "NaN",
      },
    });

    assertValidationError(invalidReviewResponse, ["executionRating"]);

    const invalidScreenshotResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/screenshots/presign`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        fileName: "chart.png",
        contentType: "image/png",
        sortOrder: "-1",
      },
    });

    assertValidationError(invalidScreenshotResponse, ["sortOrder"]);
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

test("trade result is recomputed from profit at the API boundary", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `nvo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
    const createAccountResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Result Test Account",
        broker: "Manual",
        type: "Personal",
        balance: "10000",
        currency: "USD",
      },
    });

    assert.equal(createAccountResponse.statusCode, 201);
    const accountId = createAccountResponse.json().account.id as string;

    const createTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: today,
        accountId,
        pair: "XAUUSD",
        direction: "Sell",
        entry: "3000",
        stopLoss: "2990",
        takeProfit: "3020",
        profit: "0",
        result: "Win",
        notes: "Server-side result derivation regression",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    assert.equal(createTradeResponse.json().trade.direction, "Buy");
    assert.equal(createTradeResponse.json().trade.result, "Breakeven");

    const tradeId = createTradeResponse.json().trade.id as string;

    const updateTradeResponse = await app.inject({
      method: "PATCH",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        entry: "3000",
        stopLoss: "3015",
        profit: "-25.5",
        result: "Win",
        direction: "Buy",
      },
    });

    assert.equal(updateTradeResponse.statusCode, 200);
    assert.equal(updateTradeResponse.json().trade.direction, "Sell");
    assert.equal(updateTradeResponse.json().trade.result, "Loss");

    const invalidDirectionResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: today,
        accountId,
        pair: "EURUSD",
        direction: "Buy",
        entry: "1.1",
        stopLoss: "1.1",
        takeProfit: "1.12",
        profit: "10",
        result: "Win",
        notes: "Equal entry and stop loss should fail",
      },
    });

    assert.equal(invalidDirectionResponse.statusCode, 400);
    assert.equal(invalidDirectionResponse.json().error.code, "INVALID_TRADE_DIRECTION");
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
