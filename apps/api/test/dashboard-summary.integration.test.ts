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
        entry: 1.12345,
        stopLoss: 1.12,
        takeProfit: 1.13,
        profit: 125.5,
        result: "Win",
        notes: "Decimal regression coverage",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;
    assert.equal(createTradeResponse.json().trade.accountCurrency, "USD");

    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        currency: "JPY",
      },
    });

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
    assert.equal(payload.summary.displayCurrency, "USD");
    assert.equal(payload.summary.isMixedCurrency, false);
    assert.deepEqual(payload.summary.currencyTotals, [
      {
        currency: "USD",
        totalProfit: 125.5,
      },
    ]);
    assert.equal(payload.recentTrades[0]?.accountCurrency, "USD");

    const tradeDetailResponse = await app.inject({
      method: "GET",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(tradeDetailResponse.statusCode, 200);
    assert.equal(tradeDetailResponse.json().trade.accountCurrency, "USD");
    assert.equal(tradeDetailResponse.json().trade.account?.currency, "JPY");
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

test("dashboard and analytics suppress mixed-currency profit aggregation until the user scopes to one currency", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `mc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

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
    const usdAccount = await createAccountViaApi(app, sessionCookie, {
      name: "USD Account",
      currency: "USD",
    });
    const eurAccount = await createAccountViaApi(app, sessionCookie, {
      name: "EUR Account",
      currency: "EUR",
    });

    const createUsdTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: today,
        accountId: usdAccount.id,
        pair: "EURUSD",
        direction: "Buy",
        entry: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        profit: 100,
        result: "Win",
        notes: "USD trade",
      },
    });

    assert.equal(createUsdTradeResponse.statusCode, 201);
    assert.equal(createUsdTradeResponse.json().trade.accountCurrency, "USD");

    const createEurTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        date: today,
        accountId: eurAccount.id,
        pair: "GBPUSD",
        direction: "Sell",
        entry: 1.25,
        stopLoss: 1.26,
        takeProfit: 1.23,
        profit: -40,
        result: "Loss",
        notes: "EUR trade",
      },
    });

    assert.equal(createEurTradeResponse.statusCode, 201);
    assert.equal(createEurTradeResponse.json().trade.accountCurrency, "EUR");

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/dashboard/summary",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(summaryResponse.statusCode, 200);
    const summaryPayload = summaryResponse.json();
    assert.equal(summaryPayload.summary.isMixedCurrency, true);
    assert.equal(summaryPayload.summary.totalProfit, null);
    assert.equal(summaryPayload.summary.displayCurrency, null);
    assert.deepEqual(summaryPayload.summary.currencyTotals, [
      { currency: "EUR", totalProfit: -40 },
      { currency: "USD", totalProfit: 100 },
    ]);
    assert.equal(summaryPayload.equityCurve.length, 0);
    assert.equal(summaryPayload.recentTrades.length, 2);

    const breakdownsResponse = await app.inject({
      method: "GET",
      url: "/analytics/breakdowns",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(breakdownsResponse.statusCode, 200);
    const breakdownsPayload = breakdownsResponse.json();
    assert.equal(breakdownsPayload.summary.isMixedCurrency, true);
    assert.equal(breakdownsPayload.summary.totalProfit, null);
    assert.equal(breakdownsPayload.summary.totalGross, null);
    assert.equal(breakdownsPayload.summary.totalLoss, null);
    assert.equal(breakdownsPayload.setupPerformance.length, 0);
    assert.equal(breakdownsPayload.pairPerformance.length, 0);
    assert.equal(breakdownsPayload.accountPerformance.length, 2);

    const accountCurrencyRows = (breakdownsPayload.accountPerformance as Array<{ currency: string; profit: number }>)
      .map((row) => ({
        currency: row.currency,
        profit: row.profit,
      }))
      .sort((left, right) => left.currency.localeCompare(right.currency));

    assert.deepEqual(accountCurrencyRows, [
      { currency: "EUR", profit: -40 },
      { currency: "USD", profit: 100 },
    ]);

    const calendarResponse = await app.inject({
      method: "GET",
      url: `/analytics/calendar?month=${month}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(calendarResponse.statusCode, 200);
    const calendarPayload = calendarResponse.json();
    assert.equal(calendarPayload.summary.isMixedCurrency, true);
    assert.equal(calendarPayload.summary.totalProfit, null);
    assert.deepEqual(calendarPayload.summary.currencyTotals, [
      { currency: "EUR", totalProfit: -40 },
      { currency: "USD", totalProfit: 100 },
    ]);
    assert.equal(calendarPayload.days.length, 0);
    assert.equal(calendarPayload.weeks.length, 0);
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

test("analytics breakdowns and calendar preserve grouped metrics with account scoping and month windows", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `an${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const month = "2026-04";

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
    const usdAccount = await createAccountViaApi(app, sessionCookie, {
      name: "Analytics USD",
      currency: "USD",
    });
    const eurAccount = await createAccountViaApi(app, sessionCookie, {
      name: "Analytics EUR",
      currency: "EUR",
    });

    const createSetupResponse = await app.inject({
      method: "POST",
      url: "/setups",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Breakout",
        description: "Breakout setup",
        color: "#1d4ed8",
      },
    });

    assert.equal(createSetupResponse.statusCode, 201);
    const setupId = createSetupResponse.json().setup.id as string;

    const tradePayloads = [
      {
        date: "2026-04-02",
        accountId: usdAccount.id,
        setupId,
        pair: "eur usd",
        entry: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        profit: 100,
        riskAmount: 50,
        session: "London",
        emotion: "Focused",
        notes: "April win",
      },
      {
        date: "2026-04-09",
        accountId: usdAccount.id,
        setupId,
        pair: "GBPUSD",
        entry: 1.25,
        stopLoss: 1.26,
        takeProfit: 1.23,
        profit: -40,
        riskAmount: 40,
        session: "London",
        emotion: "Calm",
        notes: "April loss",
      },
      {
        date: "2026-03-31",
        accountId: usdAccount.id,
        setupId,
        pair: "EURUSD",
        entry: 1.09,
        stopLoss: 1.08,
        takeProfit: 1.11,
        profit: 30,
        riskAmount: 30,
        session: "Asia",
        emotion: "Calm",
        notes: "Visible prior-month day",
      },
      {
        date: "2026-04-10",
        accountId: eurAccount.id,
        pair: "USDJPY",
        entry: 150,
        stopLoss: 149,
        takeProfit: 152,
        profit: 999,
        notes: "Other account should be excluded by filter",
      },
    ];

    for (const payload of tradePayloads) {
      const createTradeResponse = await app.inject({
        method: "POST",
        url: "/trades",
        headers: {
          cookie: sessionCookie,
        },
        payload,
      });

      assert.equal(createTradeResponse.statusCode, 201);
    }

    const breakdownsResponse = await app.inject({
      method: "GET",
      url: `/analytics/breakdowns?accountId=${usdAccount.id}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(breakdownsResponse.statusCode, 200);
    const breakdownsPayload = breakdownsResponse.json();
    assert.equal(breakdownsPayload.summary.totalTrades, 3);
    assert.equal(breakdownsPayload.summary.wins, 2);
    assert.equal(breakdownsPayload.summary.losses, 1);
    assert.equal(breakdownsPayload.summary.breakevens, 0);
    assert.equal(breakdownsPayload.summary.totalProfit, 90);
    assert.equal(breakdownsPayload.summary.totalGross, 130);
    assert.equal(breakdownsPayload.summary.totalLoss, -40);
    assert.equal(breakdownsPayload.summary.winRate, 66.67);
    assert.equal(breakdownsPayload.summary.avgRR, 2);
    assert.equal(breakdownsPayload.summary.avgPlannedRR, 2);
    assert.equal(breakdownsPayload.summary.avgRealizedR, 0.67);
    assert.equal(breakdownsPayload.summary.displayCurrency, "USD");
    assert.equal(breakdownsPayload.summary.isMixedCurrency, false);
    assert.deepEqual(breakdownsPayload.summary.currencyTotals, [
      { currency: "USD", totalProfit: 90 },
    ]);

    assert.deepEqual(breakdownsPayload.winLoss, [
      { key: "wins", name: "Wins", value: 2, percentage: 66.67 },
      { key: "losses", name: "Losses", value: 1, percentage: 33.33 },
      { key: "breakevens", name: "Breakeven", value: 0, percentage: 0 },
    ]);

    assert.deepEqual(breakdownsPayload.setupPerformance, [
      {
        key: "Breakout",
        label: "Breakout",
        trades: 3,
        wins: 2,
        winRate: 66.67,
        profit: 90,
        averageProfit: 30,
      },
    ]);

    assert.deepEqual(breakdownsPayload.sessionPerformance, [
      {
        key: "London",
        label: "London",
        trades: 2,
        wins: 1,
        winRate: 50,
        profit: 60,
        averageProfit: 30,
      },
      {
        key: "Asia",
        label: "Asia",
        trades: 1,
        wins: 1,
        winRate: 100,
        profit: 30,
        averageProfit: 30,
      },
    ]);

    assert.deepEqual(breakdownsPayload.emotionPerformance, [
      {
        key: "Focused",
        label: "Focused",
        trades: 1,
        wins: 1,
        winRate: 100,
        profit: 100,
        averageProfit: 100,
      },
      {
        key: "Calm",
        label: "Calm",
        trades: 2,
        wins: 1,
        winRate: 50,
        profit: -10,
        averageProfit: -5,
      },
    ]);

    assert.deepEqual(breakdownsPayload.pairPerformance, [
      {
        key: "EURUSD",
        label: "EURUSD",
        trades: 2,
        wins: 2,
        winRate: 100,
        profit: 130,
        averageProfit: 65,
      },
      {
        key: "GBPUSD",
        label: "GBPUSD",
        trades: 1,
        wins: 0,
        winRate: 0,
        profit: -40,
        averageProfit: -40,
      },
    ]);

    assert.deepEqual(breakdownsPayload.accountPerformance, [
      {
        key: `${usdAccount.id}::USD`,
        label: "Analytics USD",
        accountId: usdAccount.id,
        currency: "USD",
        trades: 3,
        wins: 2,
        winRate: 66.67,
        profit: 90,
        averageProfit: 30,
      },
    ]);

    const calendarResponse = await app.inject({
      method: "GET",
      url: `/analytics/calendar?accountId=${usdAccount.id}&month=${month}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(calendarResponse.statusCode, 200);
    const calendarPayload = calendarResponse.json();
    assert.equal(calendarPayload.summary.totalTrades, 2);
    assert.equal(calendarPayload.summary.totalProfit, 60);
    assert.equal(calendarPayload.summary.winRate, 50);
    assert.equal(calendarPayload.summary.displayCurrency, "USD");
    assert.equal(calendarPayload.summary.isMixedCurrency, false);
    assert.deepEqual(calendarPayload.summary.currencyTotals, [
      { currency: "USD", totalProfit: 60 },
    ]);

    const priorMonthVisibleDay = (calendarPayload.days as Array<{ date: string; inCurrentMonth: boolean; totalProfit: number; tradeCount: number; wins: number; winRate: number; grossProfit: number; grossLoss: number }>)
      .find((day) => day.date === "2026-03-31");
    assert.deepEqual(priorMonthVisibleDay, {
      date: "2026-03-31",
      inCurrentMonth: false,
      totalProfit: 30,
      tradeCount: 1,
      wins: 1,
      winRate: 100,
      grossProfit: 30,
      grossLoss: 0,
    });

    const firstAprilTradeDay = (calendarPayload.days as Array<{ date: string; totalProfit: number; tradeCount: number; wins: number; winRate: number; grossProfit: number; grossLoss: number }>)
      .find((day) => day.date === "2026-04-02");
    assert.deepEqual(firstAprilTradeDay, {
      date: "2026-04-02",
      inCurrentMonth: true,
      totalProfit: 100,
      tradeCount: 1,
      wins: 1,
      winRate: 100,
      grossProfit: 100,
      grossLoss: 0,
    });

    const secondAprilTradeDay = (calendarPayload.days as Array<{ date: string; totalProfit: number; tradeCount: number; wins: number; winRate: number; grossProfit: number; grossLoss: number }>)
      .find((day) => day.date === "2026-04-09");
    assert.deepEqual(secondAprilTradeDay, {
      date: "2026-04-09",
      inCurrentMonth: true,
      totalProfit: -40,
      tradeCount: 1,
      wins: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: -40,
    });

    assert.deepEqual(calendarPayload.weeks[0], {
      weekNumber: 1,
      days: calendarPayload.weeks[0].days,
      summary: {
        tradeCount: 1,
        totalProfit: 100,
        winRate: 100,
      },
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
