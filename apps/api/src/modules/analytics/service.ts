import { prisma } from "../../lib/prisma.js";
import type { TradeResultValue } from "../../config/domain.js";
import { toNumber } from "../../lib/decimal.js";
import { sessionFromDb } from "../../utils/domain-mappers.js";

type PlainTrade = {
  id: string;
  date: string;
  pair: string;
  direction: "Buy" | "Sell";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result: TradeResultValue;
  session: "Asia" | "London" | "New York" | null;
  emotion: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated" | null;
  setup: string;
  setupColor: string | null;
  accountId: string;
  accountName: string;
  createdAt: string;
};

function buildAnalyticsTradeWhere(userId: string, accountId?: string) {
  return {
    userId,
    accountId,
    deletedAt: null,
  };
}

function normalizeTradePair(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

async function getTradesForAnalytics(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: buildAnalyticsTradeWhere(userId, accountId),
    include: {
      account: true,
      setup: true,
    },
    orderBy: [
      { tradeDate: "asc" },
      { createdAt: "asc" },
    ],
  });

  return trades.map<PlainTrade>((trade) => ({
    id: trade.id,
    date: trade.tradeDate.toISOString().slice(0, 10),
    pair: normalizeTradePair(trade.pair),
    direction: trade.direction,
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    profit: toNumber(trade.profit),
    result: trade.result,
    session: sessionFromDb(trade.session) as PlainTrade["session"],
    emotion: trade.emotion as PlainTrade["emotion"],
    setup: trade.setupNameSnapshot ?? "",
    setupColor: trade.setup?.color ?? null,
    accountId: trade.accountId,
    accountName: trade.account.name,
    createdAt: trade.createdAt.toISOString(),
  }));
}

async function getDashboardSummaryStats(userId: string, accountId?: string) {
  const where = buildAnalyticsTradeWhere(userId, accountId);
  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const [aggregate, winCount, todayTrades] = await Promise.all([
    prisma.trade.aggregate({
      where,
      _count: {
        _all: true,
      },
      _sum: {
        profit: true,
      },
    }),
    prisma.trade.count({
      where: {
        ...where,
        result: "Win",
      },
    }),
    prisma.trade.count({
      where: {
        ...where,
        tradeDate: todayStart,
      },
    }),
  ]);

  const totalTrades = aggregate._count._all;
  const totalProfit = toNumber(aggregate._sum.profit);
  const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(2)) : 0;

  return {
    todayTrades,
    totalTrades,
    winRate,
    totalProfit: Number(totalProfit.toFixed(2)),
  };
}

async function getRecentTrades(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: buildAnalyticsTradeWhere(userId, accountId),
    include: {
      account: true,
      setup: true,
    },
    orderBy: [
      { tradeDate: "desc" },
      { createdAt: "desc" },
    ],
    take: 8,
  });

  return trades.map<PlainTrade>((trade) => ({
    id: trade.id,
    date: trade.tradeDate.toISOString().slice(0, 10),
    pair: normalizeTradePair(trade.pair),
    direction: trade.direction,
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    profit: toNumber(trade.profit),
    result: trade.result,
    session: sessionFromDb(trade.session) as PlainTrade["session"],
    emotion: trade.emotion as PlainTrade["emotion"],
    setup: trade.setupNameSnapshot ?? "",
    setupColor: trade.setup?.color ?? null,
    accountId: trade.accountId,
    accountName: trade.account.name,
    createdAt: trade.createdAt.toISOString(),
  }));
}

function computeStats(trades: PlainTrade[]) {
  const totalTrades = trades.length;
  const wins = trades.filter((trade) => trade.result === "Win").length;
  const losses = trades.filter((trade) => trade.result === "Loss").length;
  const breakevens = trades.filter((trade) => trade.result === "Breakeven").length;
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const totalGross = trades.filter((trade) => trade.profit > 0).reduce((sum, trade) => sum + trade.profit, 0);
  const totalLoss = trades.filter((trade) => trade.profit < 0).reduce((sum, trade) => sum + trade.profit, 0);
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  const rrValues = trades
    .map((trade) => {
      const risk = Math.abs(trade.entry - trade.stopLoss);
      const reward = Math.abs(trade.takeProfit - trade.entry);
      return risk > 0 ? reward / risk : 0;
    })
    .filter((value) => value > 0);

  const avgRR = rrValues.length > 0 ? rrValues.reduce((sum, value) => sum + value, 0) / rrValues.length : 0;

  return {
    totalTrades,
    wins,
    losses,
    breakevens,
    totalProfit: Number(totalProfit.toFixed(2)),
    totalGross: Number(totalGross.toFixed(2)),
    totalLoss: Number(totalLoss.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    avgRR: Number(avgRR.toFixed(2)),
  };
}

function buildGroupedPerformance<T extends string>(trades: PlainTrade[], selector: (trade: PlainTrade) => T | null) {
  const map = new Map<string, { key: string; trades: number; wins: number; profit: number }>();

  for (const trade of trades) {
    const key = selector(trade);
    if (!key) continue;

    const entry = map.get(key) ?? { key, trades: 0, wins: 0, profit: 0 };
    entry.trades += 1;
    if (trade.result === "Win") entry.wins += 1;
    entry.profit += trade.profit;
    map.set(key, entry);
  }

  return Array.from(map.values())
    .map((entry) => ({
      key: entry.key,
      label: entry.key,
      trades: entry.trades,
      wins: entry.wins,
      winRate: entry.trades > 0 ? Number(((entry.wins / entry.trades) * 100).toFixed(2)) : 0,
      profit: Number(entry.profit.toFixed(2)),
      averageProfit: entry.trades > 0 ? Number((entry.profit / entry.trades).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.profit - a.profit || b.trades - a.trades);
}

export async function getDashboardSummary(userId: string, accountId?: string) {
  const [summary, recentTrades, equityTrades] = await Promise.all([
    getDashboardSummaryStats(userId, accountId),
    getRecentTrades(userId, accountId),
    prisma.trade.findMany({
      where: buildAnalyticsTradeWhere(userId, accountId),
      select: {
        tradeDate: true,
        pair: true,
        profit: true,
      },
      orderBy: [
        { tradeDate: "asc" },
        { createdAt: "asc" },
      ],
    }),
  ]);

  let runningEquity = 0;
  const equityCurve = equityTrades.map((trade, index) => {
    const profit = toNumber(trade.profit);
    runningEquity += profit;

    return {
      tradeNumber: index + 1,
      date: trade.tradeDate.toISOString().slice(0, 10),
      pair: trade.pair,
      profit,
      equity: Number(runningEquity.toFixed(2)),
    };
  });

  return {
    summary,
    recentTrades,
    equityCurve,
  };
}

export async function getAnalyticsBreakdowns(userId: string, accountId?: string) {
  const trades = await getTradesForAnalytics(userId, accountId);
  const stats = computeStats(trades);

  return {
    summary: stats,
    winLoss: [
      {
        key: "wins",
        name: "Wins",
        value: stats.wins,
        percentage: stats.totalTrades > 0 ? Number(((stats.wins / stats.totalTrades) * 100).toFixed(2)) : 0,
      },
      {
        key: "losses",
        name: "Losses",
        value: stats.losses,
        percentage: stats.totalTrades > 0 ? Number(((stats.losses / stats.totalTrades) * 100).toFixed(2)) : 0,
      },
      {
        key: "breakevens",
        name: "Breakeven",
        value: stats.breakevens,
        percentage: stats.totalTrades > 0 ? Number(((stats.breakevens / stats.totalTrades) * 100).toFixed(2)) : 0,
      },
    ],
    setupPerformance: buildGroupedPerformance(trades, (trade) => trade.setup || null),
    sessionPerformance: buildGroupedPerformance(trades, (trade) => trade.session),
    emotionPerformance: buildGroupedPerformance(trades, (trade) => trade.emotion),
    pairPerformance: buildGroupedPerformance(trades, (trade) => trade.pair),
    accountPerformance: buildGroupedPerformance(trades, (trade) => `${trade.accountName}::${trade.accountId}`).map((entry) => ({
      ...entry,
      label: entry.key.split("::")[0],
      accountId: entry.key.split("::")[1],
    })),
  };
}

export async function getAnalyticsCalendar(userId: string, params: {
  accountId?: string;
  month: string;
}) {
  const trades = await getTradesForAnalytics(userId, params.accountId);
  const monthTrades = trades.filter((trade) => trade.date.startsWith(params.month));

  const tradeMap = new Map<string, PlainTrade[]>();

  for (const trade of trades) {
    const existing = tradeMap.get(trade.date) ?? [];
    existing.push(trade);
    tradeMap.set(trade.date, existing);
  }

  const [year, month] = params.month.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  const firstVisible = new Date(start);
  firstVisible.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const lastVisible = new Date(end);
  lastVisible.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const days = [];

  for (let cursor = new Date(firstVisible); cursor <= lastVisible; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const dayTrades = tradeMap.get(date) ?? [];
    const totalProfit = dayTrades.reduce((sum, trade) => sum + trade.profit, 0);
    const tradeCount = dayTrades.length;
    const wins = dayTrades.filter((trade) => trade.result === "Win").length;
    const grossProfit = dayTrades.filter((trade) => trade.profit > 0).reduce((sum, trade) => sum + trade.profit, 0);
    const grossLoss = dayTrades.filter((trade) => trade.profit < 0).reduce((sum, trade) => sum + trade.profit, 0);

    days.push({
      date,
      inCurrentMonth: date.startsWith(params.month),
      totalProfit: Number(totalProfit.toFixed(2)),
      tradeCount,
      wins,
      winRate: tradeCount > 0 ? Number(((wins / tradeCount) * 100).toFixed(2)) : 0,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
    });
  }

  const weeks = [];

  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7);
    const currentMonthDays = weekDays.filter((day) => day.inCurrentMonth);
    const tradeCount = currentMonthDays.reduce((sum, day) => sum + day.tradeCount, 0);
    const wins = currentMonthDays.reduce((sum, day) => sum + day.wins, 0);
    const totalProfit = currentMonthDays.reduce((sum, day) => sum + day.totalProfit, 0);

    weeks.push({
      weekNumber: weeks.length + 1,
      days: weekDays,
      summary: {
        tradeCount,
        totalProfit: Number(totalProfit.toFixed(2)),
        winRate: tradeCount > 0 ? Number(((wins / tradeCount) * 100).toFixed(2)) : 0,
      },
    });
  }

  const monthStats = computeStats(monthTrades);

  return {
    month: params.month,
    summary: {
      totalTrades: monthStats.totalTrades,
      totalProfit: monthStats.totalProfit,
      winRate: monthStats.winRate,
    },
    days,
    weeks,
  };
}
