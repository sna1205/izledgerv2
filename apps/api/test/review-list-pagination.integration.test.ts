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

test("review listing paginates daily reviews and filters trade reviews by review date window", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `rl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

    for (const reviewDate of ["2026-03-03", "2026-03-14", "2026-03-28"]) {
      const createReviewResponse = await app.inject({
        method: "POST",
        url: "/reviews",
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          type: "daily",
          reviewDate,
          lessonLearned: `Daily ${reviewDate}`,
        },
      });

      assert.equal(createReviewResponse.statusCode, 201);
    }

    const tradeDates = ["2026-02-24", "2026-03-08", "2026-03-21"];

    for (const tradeDate of tradeDates) {
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
          entry: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          profit: 100,
          result: "Win",
          notes: `Trade ${tradeDate}`,
        },
      });

      assert.equal(createTradeResponse.statusCode, 201);
      const tradeId = createTradeResponse.json().trade.id as string;

      const createReviewResponse = await app.inject({
        method: "POST",
        url: "/reviews",
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          type: "trade",
          tradeId,
          reviewDate: tradeDate,
          lessonLearned: `Trade review ${tradeDate}`,
          executionRating: 4,
        },
      });

      assert.equal(createReviewResponse.statusCode, 201);
    }

    const firstDailyPageResponse = await app.inject({
      method: "GET",
      url: "/reviews?type=daily&page=1&pageSize=2&sortBy=reviewDate&sortOrder=asc&dateFrom=2026-03-01&dateTo=2026-03-31",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(firstDailyPageResponse.statusCode, 200);
    const firstDailyPagePayload = firstDailyPageResponse.json();
    assert.deepEqual(firstDailyPagePayload.items.map((item: { reviewDate: string }) => item.reviewDate), [
      "2026-03-03",
      "2026-03-14",
    ]);
    assert.deepEqual(firstDailyPagePayload.pagination, {
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });

    const secondDailyPageResponse = await app.inject({
      method: "GET",
      url: "/reviews?type=daily&page=2&pageSize=2&sortBy=reviewDate&sortOrder=asc&dateFrom=2026-03-01&dateTo=2026-03-31",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(secondDailyPageResponse.statusCode, 200);
    const secondDailyPagePayload = secondDailyPageResponse.json();
    assert.deepEqual(secondDailyPagePayload.items.map((item: { reviewDate: string }) => item.reviewDate), [
      "2026-03-28",
    ]);
    assert.equal(secondDailyPagePayload.pagination.hasPreviousPage, true);

    const tradeWindowResponse = await app.inject({
      method: "GET",
      url: "/reviews?type=trade&page=1&pageSize=10&sortBy=reviewDate&sortOrder=asc&dateFrom=2026-03-01&dateTo=2026-03-31",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(tradeWindowResponse.statusCode, 200);
    const tradeWindowPayload = tradeWindowResponse.json();
    assert.deepEqual(tradeWindowPayload.items.map((item: { reviewDate: string }) => item.reviewDate), [
      "2026-03-08",
      "2026-03-21",
    ]);
    assert.equal(tradeWindowPayload.pagination.total, 2);
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

test("review listing supports weekly overlap windows with stable pagination", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `rw${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

    for (const [weekStart, weekEnd, weeklySummary] of [
      ["2026-03-02", "2026-03-08", "Week one"],
      ["2026-03-09", "2026-03-15", "Week two"],
      ["2026-03-16", "2026-03-22", "Week three"],
    ] as const) {
      const createReviewResponse = await app.inject({
        method: "POST",
        url: "/reviews",
        headers: {
          cookie: sessionCookie,
        },
        payload: {
          type: "weekly",
          weekStart,
          weekEnd,
          weeklySummary,
          weeklyRating: 7,
        },
      });

      assert.equal(createReviewResponse.statusCode, 201);
    }

    const weeklyWindowResponse = await app.inject({
      method: "GET",
      url: "/reviews?type=weekly&page=1&pageSize=2&sortBy=weekEnd&sortOrder=desc&dateFrom=2026-03-10&dateTo=2026-03-31",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(weeklyWindowResponse.statusCode, 200);
    const weeklyWindowPayload = weeklyWindowResponse.json();
    assert.deepEqual(weeklyWindowPayload.items.map((item: { weekEnd: string }) => item.weekEnd), [
      "2026-03-22",
      "2026-03-15",
    ]);
    assert.deepEqual(weeklyWindowPayload.pagination, {
      page: 1,
      pageSize: 2,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
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
