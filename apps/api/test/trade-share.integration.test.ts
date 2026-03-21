import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
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

test("trade shares store snapshots, filter public fields, increment views, and revoke cleanly", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ts${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

    assert.ok(account, "Expected a default account for the registered user.");

    const createTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: today,
        accountId: account.id,
        pair: "XAUUSD",
        direction: "Sell",
        entry: 2930.5,
        stopLoss: 2938.1,
        takeProfit: 2915.3,
        profit: 420.75,
        result: "Win",
        session: "London",
        emotion: "Focused",
        notes: "Shared-trade integration coverage",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const createShareResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/share`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        settings: {
          showPnl: false,
          showAccountName: false,
          showNotes: true,
          showScreenshots: false,
          showExactPrices: false,
        },
      },
    });

    assert.equal(createShareResponse.statusCode, 201);
    const createdShare = createShareResponse.json().share;

    assert.equal(createdShare.status, "active");
    assert.equal(createdShare.viewCount, 0);
    assert.ok(createdShare.publicUrl.endsWith(`/shared/trade/${createdShare.shareId}`));

    const storedShare = await prisma.tradeShare.findUnique({
      where: {
        tradeId_userId: {
          tradeId,
          userId: account.userId,
        },
      },
    });

    assert.ok(storedShare, "Expected trade share to be persisted.");
    assert.equal((storedShare.shareSettings as { version?: number }).version, 1);
    assert.equal((storedShare.snapshot as { version?: number }).version, 1);

    const listSharesResponse = await app.inject({
      method: "GET",
      url: `/trades/${tradeId}/shares`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(listSharesResponse.statusCode, 200);
    assert.equal(listSharesResponse.json().items.length, 1);

    const updateShareResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/share`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        settings: {
          showPnl: true,
          showAccountName: true,
          showNotes: true,
          showScreenshots: false,
          showExactPrices: true,
        },
      },
    });

    assert.equal(updateShareResponse.statusCode, 201);
    const updatedShare = updateShareResponse.json().share;
    assert.equal(updatedShare.shareId, createdShare.shareId);

    const publicShareResponse = await app.inject({
      method: "GET",
      url: `/shared/trade/${createdShare.shareId}`,
    });

    assert.equal(publicShareResponse.statusCode, 200);
    const publicPayload = publicShareResponse.json().trade;

    assert.equal(publicPayload.pair, "XAUUSD");
    assert.equal(publicPayload.direction, "Sell");
    assert.equal(publicPayload.accountName, account.name);
    assert.equal(publicPayload.pnl, 420.75);
    assert.equal(publicPayload.entry, 2930.5);
    assert.equal(publicPayload.stopLoss, 2938.1);
    assert.equal(publicPayload.takeProfit, 2915.3);
    assert.equal(publicPayload.notes, "Shared-trade integration coverage");
    assert.deepEqual(publicPayload.screenshots, []);

    const postViewListResponse = await app.inject({
      method: "GET",
      url: `/trades/${tradeId}/shares`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(postViewListResponse.statusCode, 200);
    assert.equal(postViewListResponse.json().items[0].viewCount, 1);

    const revokeResponse = await app.inject({
      method: "PATCH",
      url: `/shared/trade/${createdShare.shareId}/revoke`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(revokeResponse.statusCode, 200);
    assert.equal(revokeResponse.json().share.status, "revoked");
    assert.equal(revokeResponse.json().share.publicUrl, null);

    const revokedPublicResponse = await app.inject({
      method: "GET",
      url: `/shared/trade/${createdShare.shareId}`,
    });

    assert.equal(revokedPublicResponse.statusCode, 410);
    assert.equal(revokedPublicResponse.json().error.code, "TRADE_SHARE_REVOKED");
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

test("legacy unversioned trade share payloads still load after versioned rollout", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `tl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

    assert.ok(account, "Expected a default account for the registered user.");

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
        entry: 1.09,
        stopLoss: 1.08,
        takeProfit: 1.11,
        profit: 120,
        result: "Win",
        session: "London",
        emotion: "Focused",
        notes: "Legacy share payload coverage",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const createShareResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/share`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        settings: {
          showPnl: true,
          showAccountName: true,
          showNotes: true,
          showScreenshots: false,
          showExactPrices: true,
        },
      },
    });

    assert.equal(createShareResponse.statusCode, 201);
    const createdShare = createShareResponse.json().share;

    await prisma.tradeShare.update({
      where: {
        tradeId_userId: {
          tradeId,
          userId: account.userId,
        },
      },
      data: {
        shareSettings: {
          showPnl: true,
          showAccountName: true,
          showNotes: true,
        },
        snapshot: {
          tradeId,
          pair: "EURUSD",
          direction: "Buy",
          result: "Win",
          date: today,
          entry: 1.09,
          stopLoss: 1.08,
          takeProfit: 1.11,
          pnl: 120,
          accountName: account.name,
          screenshots: [],
        },
      },
    });

    const publicShareResponse = await app.inject({
      method: "GET",
      url: `/shared/trade/${createdShare.shareId}`,
    });

    assert.equal(publicShareResponse.statusCode, 200);
    const publicPayload = publicShareResponse.json().trade;
    assert.equal(publicPayload.pair, "EURUSD");
    assert.equal(publicPayload.accountName, account.name);
    assert.equal(publicPayload.pnl, 120);
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

test("malformed stored trade share payloads fail gracefully instead of throwing internal errors", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `tm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

    assert.ok(account, "Expected a default account for the registered user.");

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
        entry: 1.28,
        stopLoss: 1.285,
        takeProfit: 1.27,
        profit: 90,
        result: "Win",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    const createShareResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/share`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        settings: {
          showPnl: true,
          showAccountName: true,
          showNotes: true,
          showScreenshots: false,
          showExactPrices: true,
        },
      },
    });

    assert.equal(createShareResponse.statusCode, 201);
    const createdShare = createShareResponse.json().share;

    await prisma.tradeShare.update({
      where: {
        tradeId_userId: {
          tradeId,
          userId: account.userId,
        },
      },
      data: {
        snapshot: {
          version: 1,
          data: {
            tradeId: "not-a-uuid",
            pair: "GBPUSD",
          },
        },
      },
    });

    const publicShareResponse = await app.inject({
      method: "GET",
      url: `/shared/trade/${createdShare.shareId}`,
    });

    assert.equal(publicShareResponse.statusCode, 410);
    assert.equal(publicShareResponse.json().error.code, "TRADE_SHARE_UNAVAILABLE");
    assert.equal(publicShareResponse.json().error.message, "This shared trade link is unavailable.");
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
