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

test("trade create/read/update/delete persists cleanly across API reads", async () => {
  await prisma.$connect();

  const username = `tp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const tradeDate = "2026-03-21";

  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);

    const account = await prisma.account.findFirst({
      where: {
        user: { username },
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
        date: tradeDate,
        accountId: account.id,
        pair: "EURUSD",
        direction: "Buy",
        entry: 1.12345,
        stopLoss: 1.12,
        takeProfit: 1.13,
        profit: 115.75,
        result: "Win",
        notes: "Initial persisted trade",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const persistedTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        tradeDate: true,
        pair: true,
        entry: true,
        stopLoss: true,
        takeProfit: true,
        profit: true,
        notes: true,
        deletedAt: true,
      },
    });

    assert.ok(persistedTrade, "Expected the trade row to be persisted.");
    assert.equal(persistedTrade.tradeDate.toISOString().slice(0, 10), tradeDate);
    assert.equal(persistedTrade.pair, "EURUSD");
    assert.equal(persistedTrade.entry.toNumber(), 1.12345);
    assert.equal(persistedTrade.stopLoss.toNumber(), 1.12);
    assert.equal(persistedTrade.takeProfit.toNumber(), 1.13);
    assert.equal(persistedTrade.profit.toNumber(), 115.75);
    assert.equal(persistedTrade.notes, "Initial persisted trade");
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
      },
    });

    assert.equal(updateTradeResponse.statusCode, 200);
    assert.equal(updateTradeResponse.json().trade.takeProfit, 1.1315);
    assert.equal(updateTradeResponse.json().trade.profit, 140.25);
    assert.equal(updateTradeResponse.json().trade.notes, "Updated persisted trade");

    const refreshedTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        takeProfit: true,
        profit: true,
        notes: true,
      },
    });

    assert.ok(refreshedTrade, "Expected the updated trade row to still exist.");
    assert.equal(refreshedTrade.takeProfit.toNumber(), 1.1315);
    assert.equal(refreshedTrade.profit.toNumber(), 140.25);
    assert.equal(refreshedTrade.notes, "Updated persisted trade");

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
