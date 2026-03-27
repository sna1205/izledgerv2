import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { TradeResultValue } from "../../config/domain.js";
import { toNumber } from "../../utils/decimal.js";
import { sessionFromDb } from "../../utils/domain-mappers.js";

type CurrencyProfitTotal = {
  currency: string;
  totalProfit: number;
};

type CurrencyScope = {
  isMixedCurrency: boolean;
  displayCurrency: string | null;
  currencyTotals: CurrencyProfitTotal[];
};

type PlainTrade = {
  id: string;
  date: string;
  pair: string;
  direction: "Buy" | "Sell";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  grossPnl: number | null;
  netPnl: number;
  fees: number | null;
  riskAmount: number | null;
  profit: number;
  result: TradeResultValue;
  session: "Asia" | "London" | "New York" | null;
  emotion: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated" | null;
  setup: string;
  setupColor: string | null;
  accountId: string;
  accountName: string;
  accountCurrency: string;
  createdAt: string;
};

type NumericLike = Prisma.Decimal | bigint | number | string | null;

type AnalyticsSummaryAggregateRow = {
  totalTrades: NumericLike;
  wins: NumericLike;
  losses: NumericLike;
  breakevens: NumericLike;
  totalProfit: NumericLike;
  totalGross: NumericLike;
  totalLoss: NumericLike;
  avgPlannedRR: NumericLike;
  avgRealizedR: NumericLike;
};

type CurrencyTotalRow = {
  currency: string | null;
  totalProfit: NumericLike;
};

type GroupedPerformanceRow = {
  key: string | null;
  label: string | null;
  trades: NumericLike;
  wins: NumericLike;
  profit: NumericLike;
};

type AccountPerformanceRow = {
  accountId: string;
  label: string;
  currency: string | null;
  trades: NumericLike;
  wins: NumericLike;
  profit: NumericLike;
};

type EquityCurveRow = {
  tradeNumber: NumericLike;
  date: Date | string;
  pair: string;
  profit: NumericLike;
  equity: NumericLike;
};

type CalendarDayAggregateRow = {
  date: Date | string;
  tradeCount: NumericLike;
  wins: NumericLike;
  totalProfit: NumericLike;
  grossProfit: NumericLike;
  grossLoss: NumericLike;
};

type AnalyticsWhereOptions = {
  dateFrom?: Date;
  dateTo?: Date;
};

type AnalyticsSummaryStats = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  totalProfit: number;
  totalGross: number;
  totalLoss: number;
  winRate: number;
  avgPlannedRR: number;
  avgRealizedR: number | null;
};

const recentTradeInclude = Prisma.validator<Prisma.TradeInclude>()({
  account: true,
  setup: true,
});

type RecentTradeRecord = Prisma.TradeGetPayload<{ include: typeof recentTradeInclude }>;

function buildAnalyticsTradeWhere(userId: string, accountId?: string, options: AnalyticsWhereOptions = {}) {
  return {
    userId,
    accountId,
    deletedAt: null,
    tradeDate:
      options.dateFrom || options.dateTo
        ? {
            gte: options.dateFrom,
            lte: options.dateTo,
          }
        : undefined,
  };
}

function buildAnalyticsTradeWhereSql(userId: string, accountId?: string, options: AnalyticsWhereOptions = {}) {
  const filters: Prisma.Sql[] = [
    Prisma.sql`t."user_id" = ${userId}::uuid`,
    Prisma.sql`t."deleted_at" IS NULL`,
  ];

  if (accountId) {
    filters.push(Prisma.sql`t."account_id" = ${accountId}::uuid`);
  }

  if (options.dateFrom) {
    filters.push(Prisma.sql`t."trade_date" >= ${options.dateFrom}`);
  }

  if (options.dateTo) {
    filters.push(Prisma.sql`t."trade_date" <= ${options.dateTo}`);
  }

  return Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`;
}

function normalizeTradePair(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : "UNKNOWN";
}

function formatDateValue(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function toInteger(value: NumericLike | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === "bigint" ? Number(value) : Number(value);
}

function toNullableNumeric(value: NumericLike | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "bigint" ? Number(value) : Number(value);
}

function roundNumber(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits));
}

function toRoundedNumber(value: NumericLike | undefined, fractionDigits = 2) {
  const numeric = toNullableNumeric(value);
  return numeric === null ? null : roundNumber(numeric, fractionDigits);
}

function buildCurrencyScope(currencyTotals: CurrencyProfitTotal[]): CurrencyScope {
  return {
    isMixedCurrency: currencyTotals.length > 1,
    displayCurrency: currencyTotals.length === 1 ? currencyTotals[0]!.currency : null,
    currencyTotals,
  };
}

function mapCurrencyTotals(rows: CurrencyTotalRow[]): CurrencyProfitTotal[] {
  return rows.map((row) => ({
    currency: normalizeCurrencyCode(row.currency),
    totalProfit: toRoundedNumber(row.totalProfit) ?? 0,
  }));
}

function mapSummaryAggregate(row: AnalyticsSummaryAggregateRow | undefined): AnalyticsSummaryStats {
  const totalTrades = toInteger(row?.totalTrades);
  const wins = toInteger(row?.wins);
  const losses = toInteger(row?.losses);
  const breakevens = toInteger(row?.breakevens);
  const avgRealizedR = toRoundedNumber(row?.avgRealizedR);

  return {
    totalTrades,
    wins,
    losses,
    breakevens,
    totalProfit: toRoundedNumber(row?.totalProfit) ?? 0,
    totalGross: toRoundedNumber(row?.totalGross) ?? 0,
    totalLoss: toRoundedNumber(row?.totalLoss) ?? 0,
    winRate: totalTrades > 0 ? roundNumber((wins / totalTrades) * 100) : 0,
    avgPlannedRR: toRoundedNumber(row?.avgPlannedRR) ?? 0,
    avgRealizedR,
  };
}

function getMonthDateRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0));
  const firstVisible = new Date(start);
  firstVisible.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const lastVisible = new Date(end);
  lastVisible.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  return {
    start,
    end,
    firstVisible,
    lastVisible,
  };
}

function mapTradeRecord(trade: RecentTradeRecord): PlainTrade {
  return {
    id: trade.id,
    date: trade.tradeDate.toISOString().slice(0, 10),
    pair: normalizeTradePair(trade.pair),
    direction: trade.direction,
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    grossPnl: trade.grossPnl === null ? null : toNumber(trade.grossPnl),
    netPnl: trade.netPnl === null ? toNumber(trade.profit) : toNumber(trade.netPnl),
    fees: trade.fees === null ? null : toNumber(trade.fees),
    riskAmount: trade.riskAmount === null ? null : toNumber(trade.riskAmount),
    profit: trade.netPnl === null ? toNumber(trade.profit) : toNumber(trade.netPnl),
    result: trade.result,
    session: sessionFromDb(trade.session) as PlainTrade["session"],
    emotion: trade.emotion as PlainTrade["emotion"],
    setup: trade.setupNameSnapshot ?? "",
    setupColor: trade.setupColorSnapshot ?? trade.setup?.color ?? null,
    accountId: trade.accountId,
    accountName: trade.account.name,
    accountCurrency: normalizeCurrencyCode(trade.accountCurrencySnapshot),
    createdAt: trade.createdAt.toISOString(),
  };
}

async function getRecentTrades(userId: string, accountId?: string) {
  const trades = await prisma.trade.findMany({
    where: buildAnalyticsTradeWhere(userId, accountId),
    include: recentTradeInclude,
    orderBy: [
      { tradeDate: "desc" },
      { createdAt: "desc" },
    ],
    take: 8,
  });

  return trades.map(mapTradeRecord);
}

async function getCurrencyTotals(userId: string, accountId?: string, options: AnalyticsWhereOptions = {}) {
  const whereClause = buildAnalyticsTradeWhereSql(userId, accountId, options);
  const rows = await prisma.$queryRaw<CurrencyTotalRow[]>(Prisma.sql`
    SELECT
      COALESCE(NULLIF(UPPER(BTRIM(t."account_currency_snapshot")), ''), 'UNKNOWN') AS "currency",
      COALESCE(SUM(COALESCE(t."net_pnl", t."profit")), 0) AS "totalProfit"
    FROM "trades" t
    ${whereClause}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  return mapCurrencyTotals(rows);
}

async function getSummaryAggregate(userId: string, accountId?: string, options: AnalyticsWhereOptions = {}) {
  const whereClause = buildAnalyticsTradeWhereSql(userId, accountId, options);
  const rows = await prisma.$queryRaw<AnalyticsSummaryAggregateRow[]>(Prisma.sql`
    SELECT
      COUNT(*) AS "totalTrades",
      COALESCE(SUM(CASE WHEN t."result" = 'Win' THEN 1 ELSE 0 END), 0) AS "wins",
      COALESCE(SUM(CASE WHEN t."result" = 'Loss' THEN 1 ELSE 0 END), 0) AS "losses",
      COALESCE(SUM(CASE WHEN t."result" = 'Breakeven' THEN 1 ELSE 0 END), 0) AS "breakevens",
      COALESCE(SUM(COALESCE(t."net_pnl", t."profit")), 0) AS "totalProfit",
      COALESCE(SUM(CASE WHEN COALESCE(t."net_pnl", t."profit") > 0 THEN COALESCE(t."net_pnl", t."profit") ELSE 0 END), 0) AS "totalGross",
      COALESCE(SUM(CASE WHEN COALESCE(t."net_pnl", t."profit") < 0 THEN COALESCE(t."net_pnl", t."profit") ELSE 0 END), 0) AS "totalLoss",
      AVG(
        CASE
          WHEN ABS(t."entry" - t."stop_loss") > 0
            THEN ABS(t."take_profit" - t."entry") / ABS(t."entry" - t."stop_loss")
          ELSE NULL
        END
      ) AS "avgPlannedRR",
      AVG(
        CASE
          WHEN t."risk_amount" IS NOT NULL AND t."risk_amount" > 0
            THEN COALESCE(t."net_pnl", t."profit") / t."risk_amount"
          ELSE NULL
        END
      ) AS "avgRealizedR"
    FROM "trades" t
    ${whereClause}
  `);

  return mapSummaryAggregate(rows[0]);
}

async function getGroupedPerformance(
  userId: string,
  accountId: string | undefined,
  groupKeySql: Prisma.Sql,
  groupLabelSql: Prisma.Sql = groupKeySql,
) {
  const whereClause = buildAnalyticsTradeWhereSql(userId, accountId);
  const rows = await prisma.$queryRaw<GroupedPerformanceRow[]>(Prisma.sql`
    SELECT
      grouped."key" AS "key",
      grouped."label" AS "label",
      COUNT(*) AS "trades",
      COALESCE(SUM(CASE WHEN grouped."result" = 'Win' THEN 1 ELSE 0 END), 0) AS "wins",
      COALESCE(SUM(grouped."profit"), 0) AS "profit"
    FROM (
      SELECT
        ${groupKeySql} AS "key",
        ${groupLabelSql} AS "label",
        t."result"::text AS "result",
        COALESCE(t."net_pnl", t."profit") AS "profit"
      FROM "trades" t
      ${whereClause}
    ) grouped
    WHERE grouped."key" IS NOT NULL
      AND grouped."label" IS NOT NULL
      AND BTRIM(grouped."key") <> ''
    GROUP BY grouped."key", grouped."label"
    ORDER BY "profit" DESC, "trades" DESC
  `);

  return rows.map((row) => {
    const trades = toInteger(row.trades);
    const wins = toInteger(row.wins);
    const profit = toRoundedNumber(row.profit) ?? 0;

    return {
      key: row.key ?? "",
      label: row.label ?? "",
      trades,
      wins,
      winRate: trades > 0 ? roundNumber((wins / trades) * 100) : 0,
      profit,
      averageProfit: trades > 0 ? roundNumber(profit / trades) : 0,
    };
  });
}

async function getAccountPerformance(userId: string, accountId?: string) {
  const whereClause = buildAnalyticsTradeWhereSql(userId, accountId);
  const rows = await prisma.$queryRaw<AccountPerformanceRow[]>(Prisma.sql`
    SELECT
      t."account_id" AS "accountId",
      a."name" AS "label",
      COALESCE(NULLIF(UPPER(BTRIM(t."account_currency_snapshot")), ''), 'UNKNOWN') AS "currency",
      COUNT(*) AS "trades",
      COALESCE(SUM(CASE WHEN t."result" = 'Win' THEN 1 ELSE 0 END), 0) AS "wins",
      COALESCE(SUM(COALESCE(t."net_pnl", t."profit")), 0) AS "profit"
    FROM "trades" t
    INNER JOIN "accounts" a ON a."id" = t."account_id"
    ${whereClause}
    GROUP BY t."account_id", a."name", 3
    ORDER BY a."name" ASC, 3 ASC
  `);

  return rows.map((row) => {
    const trades = toInteger(row.trades);
    const wins = toInteger(row.wins);
    const profit = toRoundedNumber(row.profit) ?? 0;
    const currency = normalizeCurrencyCode(row.currency);

    return {
      key: `${row.accountId}::${currency}`,
      label: row.label,
      accountId: row.accountId,
      currency,
      trades,
      wins,
      winRate: trades > 0 ? roundNumber((wins / trades) * 100) : 0,
      profit,
      averageProfit: trades > 0 ? roundNumber(profit / trades) : 0,
    };
  });
}

async function getDashboardEquityCurve(userId: string, accountId?: string) {
  const whereClause = buildAnalyticsTradeWhereSql(userId, accountId);
  const rows = await prisma.$queryRaw<EquityCurveRow[]>(Prisma.sql`
    SELECT
      ROW_NUMBER() OVER (ORDER BY t."trade_date" ASC, t."created_at" ASC) AS "tradeNumber",
      t."trade_date" AS "date",
      UPPER(REGEXP_REPLACE(BTRIM(t."pair"), '\s+', '', 'g')) AS "pair",
      COALESCE(t."net_pnl", t."profit") AS "profit",
      SUM(COALESCE(t."net_pnl", t."profit")) OVER (
        ORDER BY t."trade_date" ASC, t."created_at" ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS "equity"
    FROM "trades" t
    ${whereClause}
    ORDER BY t."trade_date" ASC, t."created_at" ASC
  `);

  return rows.map((row) => ({
    tradeNumber: toInteger(row.tradeNumber),
    date: formatDateValue(row.date),
    pair: normalizeTradePair(row.pair),
    profit: toRoundedNumber(row.profit) ?? 0,
    equity: toRoundedNumber(row.equity) ?? 0,
  }));
}

async function getCalendarDayAggregates(
  userId: string,
  accountId: string | undefined,
  options: AnalyticsWhereOptions,
) {
  const whereClause = buildAnalyticsTradeWhereSql(userId, accountId, options);
  const rows = await prisma.$queryRaw<CalendarDayAggregateRow[]>(Prisma.sql`
    SELECT
      t."trade_date" AS "date",
      COUNT(*) AS "tradeCount",
      COALESCE(SUM(CASE WHEN t."result" = 'Win' THEN 1 ELSE 0 END), 0) AS "wins",
      COALESCE(SUM(COALESCE(t."net_pnl", t."profit")), 0) AS "totalProfit",
      COALESCE(SUM(CASE WHEN COALESCE(t."net_pnl", t."profit") > 0 THEN COALESCE(t."net_pnl", t."profit") ELSE 0 END), 0) AS "grossProfit",
      COALESCE(SUM(CASE WHEN COALESCE(t."net_pnl", t."profit") < 0 THEN COALESCE(t."net_pnl", t."profit") ELSE 0 END), 0) AS "grossLoss"
    FROM "trades" t
    ${whereClause}
    GROUP BY t."trade_date"
    ORDER BY t."trade_date" ASC
  `);

  return new Map(rows.map((row) => ([
    formatDateValue(row.date),
    {
      tradeCount: toInteger(row.tradeCount),
      wins: toInteger(row.wins),
      totalProfit: toRoundedNumber(row.totalProfit) ?? 0,
      grossProfit: toRoundedNumber(row.grossProfit) ?? 0,
      grossLoss: toRoundedNumber(row.grossLoss) ?? 0,
    },
  ])));
}

export async function getDashboardSummary(userId: string, accountId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const todayDate = new Date(`${today}T00:00:00.000Z`);

  const [currencyTotals, stats, recentTrades, todayTrades] = await Promise.all([
    getCurrencyTotals(userId, accountId),
    getSummaryAggregate(userId, accountId),
    getRecentTrades(userId, accountId),
    prisma.trade.count({
      where: buildAnalyticsTradeWhere(userId, accountId, {
        dateFrom: todayDate,
        dateTo: todayDate,
      }),
    }),
  ]);

  const currencyScope = buildCurrencyScope(currencyTotals);
  const equityCurve = currencyScope.isMixedCurrency
    ? []
    : await getDashboardEquityCurve(userId, accountId);

  return {
    summary: {
      todayTrades,
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      totalProfit: currencyScope.isMixedCurrency ? null : stats.totalProfit,
      displayCurrency: currencyScope.displayCurrency,
      isMixedCurrency: currencyScope.isMixedCurrency,
      currencyTotals: currencyScope.currencyTotals,
    },
    recentTrades,
    equityCurve,
  };
}

export async function getAnalyticsBreakdowns(userId: string, accountId?: string) {
  const [currencyTotals, stats, accountPerformance] = await Promise.all([
    getCurrencyTotals(userId, accountId),
    getSummaryAggregate(userId, accountId),
    getAccountPerformance(userId, accountId),
  ]);
  const currencyScope = buildCurrencyScope(currencyTotals);

  const [setupPerformance, sessionPerformance, emotionPerformance, pairPerformance] = currencyScope.isMixedCurrency
    ? await Promise.all([Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([])])
    : await Promise.all([
      getGroupedPerformance(
        userId,
        accountId,
        Prisma.sql`NULLIF(BTRIM(COALESCE(t."setup_name_snapshot", '')), '')`,
      ),
      getGroupedPerformance(
        userId,
        accountId,
        Prisma.sql`CASE WHEN t."session" IS NULL THEN NULL ELSE REPLACE(t."session"::text, '_', ' ') END`,
      ),
      getGroupedPerformance(
        userId,
        accountId,
        Prisma.sql`NULLIF(BTRIM(t."emotion"::text), '')`,
      ),
      getGroupedPerformance(
        userId,
        accountId,
        Prisma.sql`NULLIF(UPPER(REGEXP_REPLACE(BTRIM(t."pair"), '\s+', '', 'g')), '')`,
      ),
    ]);

  return {
    summary: {
      totalTrades: stats.totalTrades,
      wins: stats.wins,
      losses: stats.losses,
      breakevens: stats.breakevens,
      totalProfit: currencyScope.isMixedCurrency ? null : stats.totalProfit,
      totalGross: currencyScope.isMixedCurrency ? null : stats.totalGross,
      totalLoss: currencyScope.isMixedCurrency ? null : stats.totalLoss,
      winRate: stats.winRate,
      avgRR: stats.avgPlannedRR,
      avgPlannedRR: stats.avgPlannedRR,
      avgRealizedR: stats.avgRealizedR,
      displayCurrency: currencyScope.displayCurrency,
      isMixedCurrency: currencyScope.isMixedCurrency,
      currencyTotals: currencyScope.currencyTotals,
    },
    winLoss: [
      {
        key: "wins",
        name: "Wins",
        value: stats.wins,
        percentage: stats.totalTrades > 0 ? roundNumber((stats.wins / stats.totalTrades) * 100) : 0,
      },
      {
        key: "losses",
        name: "Losses",
        value: stats.losses,
        percentage: stats.totalTrades > 0 ? roundNumber((stats.losses / stats.totalTrades) * 100) : 0,
      },
      {
        key: "breakevens",
        name: "Breakeven",
        value: stats.breakevens,
        percentage: stats.totalTrades > 0 ? roundNumber((stats.breakevens / stats.totalTrades) * 100) : 0,
      },
    ],
    setupPerformance,
    sessionPerformance,
    emotionPerformance,
    pairPerformance,
    accountPerformance,
  };
}

export async function getAnalyticsCalendar(userId: string, params: {
  accountId?: string;
  month: string;
}) {
  const monthRange = getMonthDateRange(params.month);
  const [currencyTotals, stats] = await Promise.all([
    getCurrencyTotals(userId, params.accountId, {
      dateFrom: monthRange.start,
      dateTo: monthRange.end,
    }),
    getSummaryAggregate(userId, params.accountId, {
      dateFrom: monthRange.start,
      dateTo: monthRange.end,
    }),
  ]);
  const monthCurrencyScope = buildCurrencyScope(currencyTotals);

  if (monthCurrencyScope.isMixedCurrency) {
    return {
      month: params.month,
      summary: {
        totalTrades: stats.totalTrades,
        totalProfit: null,
        winRate: stats.winRate,
        displayCurrency: null,
        isMixedCurrency: true,
        currencyTotals: monthCurrencyScope.currencyTotals,
      },
      days: [],
      weeks: [],
    };
  }

  const dayMap = await getCalendarDayAggregates(userId, params.accountId, {
    dateFrom: monthRange.firstVisible,
    dateTo: monthRange.lastVisible,
  });
  const days = [];

  for (
    let cursor = new Date(monthRange.firstVisible);
    cursor <= monthRange.lastVisible;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = cursor.toISOString().slice(0, 10);
    const aggregate = dayMap.get(date) ?? {
      tradeCount: 0,
      wins: 0,
      totalProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
    };

    days.push({
      date,
      inCurrentMonth: date.startsWith(params.month),
      totalProfit: aggregate.totalProfit,
      tradeCount: aggregate.tradeCount,
      wins: aggregate.wins,
      winRate: aggregate.tradeCount > 0 ? roundNumber((aggregate.wins / aggregate.tradeCount) * 100) : 0,
      grossProfit: aggregate.grossProfit,
      grossLoss: aggregate.grossLoss,
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
        totalProfit: roundNumber(totalProfit),
        winRate: tradeCount > 0 ? roundNumber((wins / tradeCount) * 100) : 0,
      },
    });
  }

  return {
    month: params.month,
    summary: {
      totalTrades: stats.totalTrades,
      totalProfit: stats.totalProfit,
      winRate: stats.winRate,
      displayCurrency: monthCurrencyScope.displayCurrency,
      isMixedCurrency: false,
      currencyTotals: monthCurrencyScope.currencyTotals,
    },
    days,
    weeks,
  };
}
