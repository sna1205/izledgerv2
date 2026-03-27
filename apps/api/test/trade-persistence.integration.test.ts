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

test("trade create/read/update/delete persists cleanly across API reads", async () => {
  await prisma.$connect();

  const username = `tp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const tradeDate = "2026-03-21";
  const openedAt = "2026-03-21T09:15:00.000Z";
  const closedAt = "2026-03-21T11:45:00.000Z";
  const updatedClosedAt = "2026-03-21T12:00:00.000Z";
  const clientRequestId = `req-${Date.now().toString(36)}`;

  const app = await buildApp();

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
        date: tradeDate,
        accountId: account.id,
        clientRequestId,
        pair: "EURUSD",
        direction: "Buy",
        entry: 1.12345,
        stopLoss: 1.12,
        takeProfit: 1.13,
        profit: 115.75,
        result: "Win",
        notes: "Initial persisted trade",
        openedAt,
        closedAt,
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const persistedTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        tradeDate: true,
        pair: true,
        netPnl: true,
        grossPnl: true,
        fees: true,
        accountCurrencySnapshot: true,
        pnlCurrency: true,
        fxRateSnapshot: true,
        fxRateSource: true,
        fxRateTimestamp: true,
        entry: true,
        stopLoss: true,
        takeProfit: true,
        profit: true,
        notes: true,
        clientRequestId: true,
        openedAt: true,
        closedAt: true,
        deletedAt: true,
      },
    });

    assert.ok(persistedTrade, "Expected the trade row to be persisted.");
    assert.equal(persistedTrade.tradeDate.toISOString().slice(0, 10), tradeDate);
    assert.equal(persistedTrade.pair, "EURUSD");
    assert.equal(persistedTrade.netPnl?.toNumber(), 115.75);
    assert.equal(persistedTrade.grossPnl, null);
    assert.equal(persistedTrade.fees, null);
    assert.equal(persistedTrade.accountCurrencySnapshot, "USD");
    assert.equal(persistedTrade.pnlCurrency, "USD");
    assert.equal(persistedTrade.fxRateSnapshot?.toNumber(), 1);
    assert.equal(persistedTrade.fxRateSource, "account_currency_snapshot");
    assert.equal(persistedTrade.fxRateTimestamp?.toISOString(), closedAt);
    assert.equal(persistedTrade.entry.toNumber(), 1.12345);
    assert.equal(persistedTrade.stopLoss.toNumber(), 1.12);
    assert.equal(persistedTrade.takeProfit.toNumber(), 1.13);
    assert.equal(persistedTrade.profit.toNumber(), 115.75);
    assert.equal(persistedTrade.notes, "Initial persisted trade");
    assert.equal(persistedTrade.clientRequestId, clientRequestId);
    assert.equal(persistedTrade.openedAt?.toISOString(), openedAt);
    assert.equal(persistedTrade.closedAt?.toISOString(), closedAt);
    assert.equal(persistedTrade.deletedAt, null);

    const getTradeResponse = await app.inject({
      method: "GET",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(getTradeResponse.statusCode, 200);
    assert.equal(getTradeResponse.json().trade.id, tradeId);
    assert.equal(getTradeResponse.json().trade.pair, "EURUSD");
    assert.equal(getTradeResponse.json().trade.profit, 115.75);
    assert.equal(getTradeResponse.json().trade.openedAt, openedAt);
    assert.equal(getTradeResponse.json().trade.closedAt, closedAt);

    const updateTradeResponse = await app.inject({
      method: "PATCH",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        takeProfit: 1.1315,
        profit: 140.25,
        notes: "Updated persisted trade",
        closedAt: updatedClosedAt,
        clientRequestId: "req-should-be-ignored",
      },
    });

    assert.equal(updateTradeResponse.statusCode, 200);
    assert.equal(updateTradeResponse.json().trade.takeProfit, 1.1315);
    assert.equal(updateTradeResponse.json().trade.profit, 140.25);
    assert.equal(updateTradeResponse.json().trade.notes, "Updated persisted trade");
    assert.equal(updateTradeResponse.json().trade.closedAt, updatedClosedAt);

    const refreshedTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        takeProfit: true,
        netPnl: true,
        profit: true,
        notes: true,
        closedAt: true,
        clientRequestId: true,
      },
    });

    assert.ok(refreshedTrade, "Expected the updated trade row to still exist.");
    assert.equal(refreshedTrade.takeProfit.toNumber(), 1.1315);
    assert.equal(refreshedTrade.netPnl?.toNumber(), 140.25);
    assert.equal(refreshedTrade.profit.toNumber(), 140.25);
    assert.equal(refreshedTrade.notes, "Updated persisted trade");
    assert.equal(refreshedTrade.closedAt?.toISOString(), updatedClosedAt);
    assert.equal(refreshedTrade.clientRequestId, clientRequestId);

    const listTradesResponse = await app.inject({
      method: "GET",
      url: "/trades?page=1&pageSize=20",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(listTradesResponse.statusCode, 200);
    assert.ok(
      listTradesResponse.json().items.some((item: { id: string; profit: number; notes: string }) => (
        item.id === tradeId
        && item.profit === 140.25
        && item.notes === "Updated persisted trade"
      )),
      "Expected the updated trade to round-trip through the list endpoint.",
    );

    const deleteTradeResponse = await app.inject({
      method: "DELETE",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteTradeResponse.statusCode, 204);

    const softDeletedTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        deletedAt: true,
      },
    });

    assert.ok(softDeletedTrade?.deletedAt, "Expected trade deletes to persist as soft deletes.");

    const listAfterDeleteResponse = await app.inject({
      method: "GET",
      url: "/trades?page=1&pageSize=20",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(listAfterDeleteResponse.statusCode, 200);
    assert.ok(
      listAfterDeleteResponse.json().items.every((item: { id: string }) => item.id !== tradeId),
      "Expected soft-deleted trades to stay hidden from the active list.",
    );
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("trade timestamps order same-day trades deterministically for audit reads", async () => {
  await prisma.$connect();

  const username = `tpl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const tradeDate = "2026-03-25";

  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie);

    const earlyTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: { cookie: sessionCookie },
      payload: {
        date: tradeDate,
        accountId: account.id,
        pair: "EURUSD",
        entry: 1.101,
        stopLoss: 1.099,
        takeProfit: 1.105,
        profit: 40,
        openedAt: "2026-03-25T08:00:00.000Z",
        closedAt: "2026-03-25T08:30:00.000Z",
        notes: "Early trade",
      },
    });

    const lateTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: { cookie: sessionCookie },
      payload: {
        date: tradeDate,
        accountId: account.id,
        pair: "GBPUSD",
        entry: 1.255,
        stopLoss: 1.252,
        takeProfit: 1.26,
        profit: 55,
        openedAt: "2026-03-25T10:00:00.000Z",
        closedAt: "2026-03-25T10:45:00.000Z",
        notes: "Late trade",
      },
    });

    assert.equal(earlyTradeResponse.statusCode, 201);
    assert.equal(lateTradeResponse.statusCode, 201);

    const listTradesResponse = await app.inject({
      method: "GET",
      url: "/trades?page=1&pageSize=20&sortBy=date&sortOrder=desc",
      headers: { cookie: sessionCookie },
    });

    assert.equal(listTradesResponse.statusCode, 200);
    const listedTrades = listTradesResponse.json().items as Array<{ pair: string; closedAt?: string | null }>;
    assert.equal(listedTrades[0]?.pair, "GBPUSD");
    assert.equal(listedTrades[0]?.closedAt, "2026-03-25T10:45:00.000Z");
    assert.equal(listedTrades[1]?.pair, "EURUSD");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("trade create ignores client-derived direction, result, pnl copies, and risk percent", async () => {
  await prisma.$connect();

  const username = `tpf${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const tradeDate = "2026-03-22";

  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie, {
      balance: 5_000,
    });

    const createTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: tradeDate,
        accountId: account.id,
        pair: "XAUUSD",
        entry: 3000,
        stopLoss: 3010,
        takeProfit: 2980,
        exitPrice: 2988,
        quantity: 2.5,
        lotSize: 0.25,
        fees: 5.25,
        riskAmount: 50,
        riskPercent: 88.88,
        grossPnl: -999,
        netPnl: -999,
        profit: 120,
        direction: "Buy",
        result: "Loss",
        notes: "Sell trade with explicit risk and fees",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const persistedTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        quantity: true,
        lotSize: true,
        exitPrice: true,
        fees: true,
        riskAmount: true,
        riskPercent: true,
        grossPnl: true,
        netPnl: true,
        profit: true,
        accountCurrencySnapshot: true,
        pnlCurrency: true,
        fxRateSnapshot: true,
        fxRateSource: true,
        fxRateTimestamp: true,
      },
    });

    assert.ok(persistedTrade);
    assert.equal(persistedTrade.quantity?.toNumber(), 2.5);
    assert.equal(persistedTrade.lotSize?.toNumber(), 0.25);
    assert.equal(persistedTrade.exitPrice?.toNumber(), 2988);
    assert.equal(persistedTrade.fees?.toNumber(), 5.25);
    assert.equal(persistedTrade.riskAmount?.toNumber(), 50);
    assert.equal(persistedTrade.riskPercent?.toNumber(), 1);
    assert.equal(persistedTrade.netPnl?.toNumber(), 120);
    assert.equal(persistedTrade.grossPnl?.toNumber(), 125.25);
    assert.equal(persistedTrade.profit.toNumber(), 120);
    assert.equal(persistedTrade.accountCurrencySnapshot, "USD");
    assert.equal(persistedTrade.pnlCurrency, "USD");
    assert.equal(persistedTrade.fxRateSnapshot?.toNumber(), 1);
    assert.equal(persistedTrade.fxRateSource, "account_currency_snapshot");
    assert.equal(persistedTrade.fxRateTimestamp?.toISOString(), "2026-03-22T00:00:00.000Z");

    const getTradeResponse = await app.inject({
      method: "GET",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(getTradeResponse.statusCode, 200);
    assert.equal(getTradeResponse.json().trade.direction, "Sell");
    assert.equal(getTradeResponse.json().trade.result, "Win");
    assert.equal(getTradeResponse.json().trade.fees, 5.25);
    assert.equal(getTradeResponse.json().trade.riskAmount, 50);
    assert.equal(getTradeResponse.json().trade.riskPercent, 1);
    assert.equal(getTradeResponse.json().trade.netPnl, 120);
    assert.equal(getTradeResponse.json().trade.grossPnl, 125.25);
    assert.equal(getTradeResponse.json().trade.pnlCurrency, "USD");
    assert.equal(getTradeResponse.json().trade.fxRateSnapshot, 1);
    assert.equal(getTradeResponse.json().trade.fxRateSource, "account_currency_snapshot");
    assert.equal(getTradeResponse.json().trade.fxRateTimestamp, "2026-03-22T00:00:00.000Z");
    assert.equal(getTradeResponse.json().trade.plannedRR, 2);
    assert.equal(getTradeResponse.json().trade.realizedR, 2.4);
    assert.equal(getTradeResponse.json().trade.profit, 120);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("trade create derives risk amount from risk percent when account balance is available", async () => {
  await prisma.$connect();

  const username = `tpr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const tradeDate = "2026-03-23";

  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie, {
      balance: 10_000,
    });

    const createTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: tradeDate,
        accountId: account.id,
        pair: "EURUSD",
        entry: 1.12345,
        stopLoss: 1.12,
        takeProfit: 1.13,
        riskAmount: null,
        riskPercent: 1.25,
        profit: 150,
        notes: "Risk percent only trade",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    assert.equal(createTradeResponse.json().trade.riskAmount, 125);
    assert.equal(createTradeResponse.json().trade.riskPercent, 1.25);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("trade create rejects risk percent without a usable account balance", async () => {
  await prisma.$connect();

  const username = `tpz${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const tradeDate = "2026-03-24";

  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie, {
      balance: 0,
    });

    const createTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: tradeDate,
        accountId: account.id,
        pair: "EURUSD",
        entry: 1.12345,
        stopLoss: 1.12,
        takeProfit: 1.13,
        riskAmount: null,
        riskPercent: 1,
        profit: 150,
        notes: "Risk percent without balance",
      },
    });

    assert.equal(createTradeResponse.statusCode, 400);
    assert.equal(createTradeResponse.json().error.code, "TRADE_RISK_AMOUNT_REQUIRED");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("trade create replays return the existing trade for the same client request id", async () => {
  await prisma.$connect();

  const username = `tpi${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const clientRequestId = `req-${Date.now().toString(36)}-replay`;

  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie);

    const firstResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: "2026-03-26",
        accountId: account.id,
        clientRequestId,
        pair: "EURUSD",
        entry: 1.12345,
        stopLoss: 1.12,
        takeProfit: 1.13,
        profit: 125.5,
        notes: "First submission wins",
      },
    });

    const replayResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: "2026-03-26",
        accountId: account.id,
        clientRequestId,
        pair: "GBPUSD",
        entry: 1.252,
        stopLoss: 1.25,
        takeProfit: 1.258,
        profit: 999,
        notes: "Replay should not overwrite the first trade",
      },
    });

    assert.equal(firstResponse.statusCode, 201);
    assert.equal(replayResponse.statusCode, 200);
    assert.equal(replayResponse.json().trade.id, firstResponse.json().trade.id);
    assert.equal(replayResponse.json().trade.pair, "EURUSD");
    assert.equal(replayResponse.json().trade.profit, 125.5);
    assert.equal(replayResponse.json().trade.notes, "First submission wins");

    const storedTrades = await prisma.trade.findMany({
      where: {
        accountId: account.id,
        clientRequestId,
        deletedAt: null,
      },
      select: {
        id: true,
        pair: true,
        profit: true,
        notes: true,
      },
    });

    assert.equal(storedTrades.length, 1);
    assert.equal(storedTrades[0]?.id, firstResponse.json().trade.id);
    assert.equal(storedTrades[0]?.pair, "EURUSD");
    assert.equal(storedTrades[0]?.profit.toNumber(), 125.5);
    assert.equal(storedTrades[0]?.notes, "First submission wins");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("trade create collapses concurrent retries onto one active trade row", async () => {
  await prisma.$connect();

  const username = `tpc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const clientRequestId = `req-${Date.now().toString(36)}-concurrent`;

  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie);

    const createPayload = {
      date: "2026-03-27",
      accountId: account.id,
      clientRequestId,
      pair: "USDJPY",
      entry: 151.25,
      stopLoss: 150.95,
      takeProfit: 151.9,
      profit: 88.4,
      openedAt: "2026-03-27T01:00:00.000Z",
      closedAt: "2026-03-27T01:25:00.000Z",
      notes: "Concurrent idempotent trade",
    };

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: "/trades",
        headers: { cookie: sessionCookie },
        payload: createPayload,
      }),
      app.inject({
        method: "POST",
        url: "/trades",
        headers: { cookie: sessionCookie },
        payload: createPayload,
      }),
      app.inject({
        method: "POST",
        url: "/trades",
        headers: { cookie: sessionCookie },
        payload: createPayload,
      }),
    ]);

    const returnedTradeIds = new Set(responses.map((response) => response.json().trade.id as string));
    const statusCodes = responses.map((response) => response.statusCode).sort();

    assert.deepEqual(statusCodes, [200, 200, 201]);
    assert.equal(returnedTradeIds.size, 1);

    const storedTrades = await prisma.trade.findMany({
      where: {
        accountId: account.id,
        clientRequestId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    assert.equal(storedTrades.length, 1);
    assert.equal(storedTrades[0]?.id, responses[0]!.json().trade.id);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});
