import { addMonths, format } from "date-fns";
import type { Direction, Result } from "@/types";

const DEFAULT_MONTH_KEY = format(new Date(), "yyyy-MM");
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type UnknownRecord = Record<string, unknown>;

type NormalizedDashboardTrade = {
  id: string;
  date: string;
  pair: string;
  direction: Direction | null;
  setup: string | null;
  setupColor: string | null;
  result: Result | null;
  profit: number;
  accountCurrency: string | null;
};

type NormalizedEquityPoint = {
  key: string;
  tradeNumber: number;
  date: string;
  shortDate: string;
  fullDate: string;
  pair: string;
  profit: number;
  equity: number;
};

export type NormalizedDashboardSummaryResponse = {
  summary: {
    todayTrades: number;
    totalTrades: number;
    winRate: number;
    totalProfit: number | null;
    displayCurrency: string | null;
    isMixedCurrency: boolean;
    currencyTotals: Array<{
      currency: string;
      totalProfit: number;
    }>;
  };
  recentTrades: NormalizedDashboardTrade[];
  equityCurve: NormalizedEquityPoint[];
};

export type NormalizedBreakdownRow = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  winRate: number;
  profit: number;
  averageProfit: number;
};

export type NormalizedAnalyticsBreakdowns = {
  summary: {
    totalTrades: number;
    wins: number;
    losses: number;
    breakevens: number;
    totalProfit: number | null;
    totalGross: number | null;
    totalLoss: number | null;
    winRate: number;
    avgRR: number;
    avgPlannedRR: number;
    avgRealizedR: number | null;
    displayCurrency: string | null;
    isMixedCurrency: boolean;
    currencyTotals: Array<{
      currency: string;
      totalProfit: number;
    }>;
  };
  winLoss: Array<{
    key: string;
    name: string;
    value: number;
    percentage: number;
  }>;
  setupPerformance: NormalizedBreakdownRow[];
  sessionPerformance: NormalizedBreakdownRow[];
  emotionPerformance: NormalizedBreakdownRow[];
  pairPerformance: NormalizedBreakdownRow[];
  accountPerformance: Array<NormalizedBreakdownRow & { accountId: string; currency: string | null }>;
};

export type NormalizedCalendarDay = {
  key: string;
  date: string;
  displayDate: string;
  dayLabel: string;
  inCurrentMonth: boolean;
  totalProfit: number;
  tradeCount: number;
  wins: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
};

export type NormalizedAnalyticsCalendar = {
  month: string;
  monthLabel: string;
  summary: {
    totalTrades: number;
    totalProfit: number | null;
    winRate: number;
    displayCurrency: string | null;
    isMixedCurrency: boolean;
    currencyTotals: Array<{
      currency: string;
      totalProfit: number;
    }>;
  };
  days: NormalizedCalendarDay[];
  weeks: Array<{
    key: string;
    days: NormalizedCalendarDay[];
    summary: {
      tradeCount: number;
      totalProfit: number;
      winRate: number;
    };
  }>;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function coerceNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const sanitized = value.trim().replace(/,/g, "").replace(/[$%]/g, "");

    if (!sanitized) {
      return fallback;
    }

    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function coerceNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return coerceNumber(value);
}

function coerceInteger(value: unknown, fallback = 0) {
  return Math.max(0, Math.round(coerceNumber(value, fallback)));
}

function coerceBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizePercent(value: unknown, fallback = 0) {
  return clamp(coerceNumber(value, fallback), 0, 100);
}

function normalizeRatio(value: unknown, fallback = 0) {
  return Math.max(0, coerceNumber(value, fallback));
}

export function normalizeMonthKey(value: unknown, fallback = DEFAULT_MONTH_KEY) {
  return typeof value === "string" && MONTH_KEY_PATTERN.test(value) ? value : fallback;
}

function toDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateKey(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  if (DATE_KEY_PATTERN.test(value)) {
    return value;
  }

  const parsed = toDate(value);

  if (!parsed) {
    return null;
  }

  return format(parsed, "yyyy-MM-dd");
}

function isResult(value: unknown): value is Result {
  return value === "Win" || value === "Loss" || value === "Breakeven";
}

function isDirection(value: unknown): value is Direction {
  return value === "Buy" || value === "Sell";
}

function normalizeCurrencyCode(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function buildFallbackDate(month: string, index: number) {
  return `${month}-${String((index % 28) + 1).padStart(2, "0")}`;
}

const defaultShortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const defaultLongDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatNumberDisplay(
  value: unknown,
  options?: {
    fallback?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
) {
  const {
    fallback = "0",
    minimumFractionDigits = 0,
    maximumFractionDigits = minimumFractionDigits,
  } = options ?? {};
  const numeric = coerceNumber(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numeric);
}

export function formatPercentageDisplay(
  value: unknown,
  options?: {
    fallback?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
) {
  const {
    fallback = "0.0%",
    minimumFractionDigits = 1,
    maximumFractionDigits = minimumFractionDigits,
  } = options ?? {};
  const numeric = coerceNumber(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const normalized = clamp(numeric, 0, 100);

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(normalized)}%`;
}

export function formatCurrencyDisplay(
  value: unknown,
  options?: {
    fallback?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showPlus?: boolean;
  },
) {
  const {
    fallback = "$0.00",
    minimumFractionDigits = 2,
    maximumFractionDigits = minimumFractionDigits,
    showPlus = true,
  } = options ?? {};
  const numeric = coerceNumber(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const sign = numeric < 0 ? "-" : showPlus && numeric > 0 ? "+" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(numeric));

  return `${sign}$${formatted}`;
}

export function formatMoneyDisplay(
  value: unknown,
  options?: {
    currency?: string | null;
    fallback?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showPlus?: boolean;
  },
) {
  const {
    currency,
    fallback = "--",
    minimumFractionDigits = 2,
    maximumFractionDigits = minimumFractionDigits,
    showPlus = true,
  } = options ?? {};
  const numeric = coerceNumber(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const sign = numeric < 0 ? "-" : showPlus && numeric > 0 ? "+" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(numeric));
  const normalizedCurrency = normalizeCurrencyCode(currency);

  if (!normalizedCurrency) {
    return `${sign}$${formatted}`;
  }

  return `${sign}${normalizedCurrency} ${formatted}`;
}

export function formatCompactCurrencyDisplay(value: unknown, fallback = "$0") {
  const numeric = coerceNumber(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const absValue = Math.abs(numeric);

  if (absValue >= 1000) {
    return `${numeric < 0 ? "-" : ""}$${(absValue / 1000).toFixed(1)}k`;
  }

  return `${numeric < 0 ? "-" : ""}$${absValue.toFixed(0)}`;
}

export function formatCompactMoneyDisplay(value: unknown, currency?: string | null, fallback = "--") {
  const numeric = coerceNumber(value, Number.NaN);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const normalizedCurrency = normalizeCurrencyCode(currency);
  const absValue = Math.abs(numeric);
  const compactValue = absValue >= 1000 ? `${(absValue / 1000).toFixed(1)}k` : absValue.toFixed(0);
  const sign = numeric < 0 ? "-" : "";

  if (!normalizedCurrency) {
    return `${sign}$${compactValue}`;
  }

  return `${sign}${normalizedCurrency} ${compactValue}`;
}

export function formatCurrencyTotalsDisplay(
  totals: Array<{ currency: string; totalProfit: number }>,
  fallback = "No PnL yet",
) {
  if (!totals.length) {
    return fallback;
  }

  return totals
    .map((total) => formatMoneyDisplay(total.totalProfit, {
      currency: total.currency,
      fallback: `${total.currency} 0.00`,
    }))
    .join(" · ");
}

export function formatDateDisplay(
  value: unknown,
  options?: {
    fallback?: string;
    formatter?: Intl.DateTimeFormat;
  },
) {
  const parsed = toDate(value);

  if (!parsed) {
    return options?.fallback ?? "--";
  }

  return (options?.formatter ?? defaultLongDateFormatter).format(parsed);
}

export function shiftMonthKey(month: unknown, offset: number) {
  const normalizedMonth = normalizeMonthKey(month);
  return format(addMonths(new Date(`${normalizedMonth}-01T00:00:00`), offset), "yyyy-MM");
}

export function normalizeDashboardSummaryResponse(payload: unknown): NormalizedDashboardSummaryResponse {
  const value = isRecord(payload) ? payload : {};
  const summaryValue = isRecord(value.summary) ? value.summary : {};
  const recentTradesValue = Array.isArray(value.recentTrades) ? value.recentTrades : [];
  const equityCurveValue = Array.isArray(value.equityCurve) ? value.equityCurve : [];

  return {
    summary: {
      todayTrades: coerceInteger(summaryValue.todayTrades),
      totalTrades: coerceInteger(summaryValue.totalTrades),
      winRate: normalizePercent(summaryValue.winRate),
      totalProfit: coerceNullableNumber(summaryValue.totalProfit),
      displayCurrency: normalizeCurrencyCode(summaryValue.displayCurrency),
      isMixedCurrency: coerceBoolean(summaryValue.isMixedCurrency),
      currencyTotals: normalizeCurrencyTotals(summaryValue.currencyTotals),
    },
    recentTrades: recentTradesValue.map((item, index) => normalizeDashboardTrade(item, index)),
    equityCurve: equityCurveValue
      .map((item, index) => normalizeEquityPoint(item, index))
      .filter((point): point is NormalizedEquityPoint => point !== null),
  };
}

function normalizeDashboardTrade(payload: unknown, index: number): NormalizedDashboardTrade {
  const value = isRecord(payload) ? payload : {};
  const date = normalizeDateKey(value.date) ?? "";

  return {
    id: coerceString(value.id, `trade-${index + 1}`),
    date,
    pair: coerceString(value.pair, "Unknown Pair"),
    direction: isDirection(value.direction) ? value.direction : null,
    setup: coerceString(value.setup) || null,
    setupColor: coerceString(value.setupColor) || null,
    result: isResult(value.result) ? value.result : null,
    profit: coerceNumber(value.profit),
    accountCurrency: normalizeCurrencyCode(value.accountCurrency),
  };
}

function normalizeEquityPoint(payload: unknown, index: number) {
  const value = isRecord(payload) ? payload : {};
  const date = normalizeDateKey(value.date);

  if (!date) {
    return null;
  }

  return {
    key: coerceString(value.tradeNumber, String(index + 1)),
    tradeNumber: coerceInteger(value.tradeNumber, index + 1),
    date,
    shortDate: formatDateDisplay(date, { formatter: defaultShortDateFormatter }),
    fullDate: formatDateDisplay(date, { formatter: defaultLongDateFormatter }),
    pair: coerceString(value.pair, "Unknown Pair"),
    profit: coerceNumber(value.profit),
    equity: coerceNumber(value.equity),
  };
}

export function normalizeAnalyticsBreakdownsResponse(payload: unknown): NormalizedAnalyticsBreakdowns {
  const value = isRecord(payload) ? payload : {};
  const summaryValue = isRecord(value.summary) ? value.summary : {};

  return {
    summary: {
      totalTrades: coerceInteger(summaryValue.totalTrades),
      wins: coerceInteger(summaryValue.wins),
      losses: coerceInteger(summaryValue.losses),
      breakevens: coerceInteger(summaryValue.breakevens),
      totalProfit: coerceNullableNumber(summaryValue.totalProfit),
      totalGross: coerceNullableNumber(summaryValue.totalGross),
      totalLoss: coerceNullableNumber(summaryValue.totalLoss),
      winRate: normalizePercent(summaryValue.winRate),
      avgRR: normalizeRatio(summaryValue.avgRR),
      avgPlannedRR: normalizeRatio(summaryValue.avgPlannedRR ?? summaryValue.avgRR),
      avgRealizedR: coerceNullableNumber(summaryValue.avgRealizedR),
      displayCurrency: normalizeCurrencyCode(summaryValue.displayCurrency),
      isMixedCurrency: coerceBoolean(summaryValue.isMixedCurrency),
      currencyTotals: normalizeCurrencyTotals(summaryValue.currencyTotals),
    },
    winLoss: normalizeWinLossRows(value.winLoss),
    setupPerformance: normalizeBreakdownRows(value.setupPerformance),
    sessionPerformance: normalizeBreakdownRows(value.sessionPerformance),
    emotionPerformance: normalizeBreakdownRows(value.emotionPerformance),
    pairPerformance: normalizeBreakdownRows(value.pairPerformance),
    accountPerformance: normalizeAccountRows(value.accountPerformance),
  };
}

function normalizeBreakdownRows(payload: unknown): NormalizedBreakdownRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item, index) => {
    const value = isRecord(item) ? item : {};

    return {
      key: coerceString(value.key, `row-${index + 1}`),
      label: coerceString(value.label, "Unknown"),
      trades: coerceInteger(value.trades),
      wins: coerceInteger(value.wins),
      winRate: normalizePercent(value.winRate),
      profit: coerceNumber(value.profit),
      averageProfit: coerceNumber(value.averageProfit),
    };
  });
}

function normalizeAccountRows(payload: unknown): Array<NormalizedBreakdownRow & { accountId: string; currency: string | null }> {
  return normalizeBreakdownRows(payload).map((row, index) => {
    const source = Array.isArray(payload) && isRecord(payload[index]) ? payload[index] : {};

    return {
      ...row,
      accountId: coerceString(source.accountId, row.key),
      currency: normalizeCurrencyCode(source.currency),
    };
  });
}

function normalizeCurrencyTotals(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => {
    const value = isRecord(item) ? item : {};

    return {
      currency: normalizeCurrencyCode(value.currency) ?? "UNKNOWN",
      totalProfit: coerceNumber(value.totalProfit),
    };
  });
}

function normalizeWinLossRows(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item, index) => {
    const value = isRecord(item) ? item : {};

    return {
      key: coerceString(value.key, `win-loss-${index + 1}`),
      name: coerceString(value.name, "Unknown"),
      value: coerceInteger(value.value),
      percentage: normalizePercent(value.percentage),
    };
  });
}

export function normalizeAnalyticsCalendarResponse(payload: unknown, requestedMonth: unknown): NormalizedAnalyticsCalendar {
  const fallbackMonth = normalizeMonthKey(requestedMonth);
  const value = isRecord(payload) ? payload : {};
  const month = normalizeMonthKey(value.month, fallbackMonth);
  const summaryValue = isRecord(value.summary) ? value.summary : {};
  const days = normalizeCalendarDays(value.days, month);
  const weeks = normalizeCalendarWeeks(value.weeks, days, month);

  return {
    month,
    monthLabel: formatDateDisplay(`${month}-01T00:00:00`, {
      fallback: "Current Month",
      formatter: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }),
    }),
    summary: {
      totalTrades: coerceInteger(summaryValue.totalTrades),
      totalProfit: coerceNullableNumber(summaryValue.totalProfit),
      winRate: normalizePercent(summaryValue.winRate),
      displayCurrency: normalizeCurrencyCode(summaryValue.displayCurrency),
      isMixedCurrency: coerceBoolean(summaryValue.isMixedCurrency),
      currencyTotals: normalizeCurrencyTotals(summaryValue.currencyTotals),
    },
    days,
    weeks,
  };
}

function normalizeCalendarDays(payload: unknown, month: string) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item, index) => normalizeCalendarDay(item, month, index));
}

function normalizeCalendarWeeks(payload: unknown, fallbackDays: NormalizedCalendarDay[], month: string) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return buildWeeksFromDays(fallbackDays);
  }

  return payload.map((item, index) => {
    const value = isRecord(item) ? item : {};
    const weekDays = Array.isArray(value.days)
      ? value.days.map((day, dayIndex) => normalizeCalendarDay(day, month, index * 7 + dayIndex))
      : fallbackDays.slice(index * 7, index * 7 + 7);
    const summaryValue = isRecord(value.summary) ? value.summary : {};

    return {
      key: weekDays[0]?.key ?? `week-${index + 1}`,
      days: weekDays,
      summary: {
        tradeCount: coerceInteger(summaryValue.tradeCount),
        totalProfit: coerceNumber(summaryValue.totalProfit),
        winRate: normalizePercent(summaryValue.winRate),
      },
    };
  });
}

function buildWeeksFromDays(days: NormalizedCalendarDay[]) {
  if (days.length === 0) {
    return [];
  }

  const weeks: Array<{
    key: string;
    days: NormalizedCalendarDay[];
    summary: {
      tradeCount: number;
      totalProfit: number;
      winRate: number;
    };
  }> = [];

  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7);
    const tradeCount = weekDays.reduce((sum, day) => sum + day.tradeCount, 0);
    const totalProfit = weekDays.reduce((sum, day) => sum + day.totalProfit, 0);
    const totalWins = weekDays.reduce((sum, day) => sum + day.wins, 0);

    weeks.push({
      key: weekDays[0]?.key ?? `week-${index / 7 + 1}`,
      days: weekDays,
      summary: {
        tradeCount,
        totalProfit,
        winRate: tradeCount > 0 ? clamp((totalWins / tradeCount) * 100, 0, 100) : 0,
      },
    });
  }

  return weeks;
}

function normalizeCalendarDay(payload: unknown, month: string, index: number): NormalizedCalendarDay {
  const value = isRecord(payload) ? payload : {};
  const date = normalizeDateKey(value.date) ?? buildFallbackDate(month, index);

  return {
    key: `${date}-${index}`,
    date,
    displayDate: formatDateDisplay(date, { fallback: date }),
    dayLabel: date.slice(-2),
    inCurrentMonth: coerceBoolean(value.inCurrentMonth, date.startsWith(month)),
    totalProfit: coerceNumber(value.totalProfit),
    tradeCount: coerceInteger(value.tradeCount),
    wins: coerceInteger(value.wins),
    winRate: normalizePercent(value.winRate),
    grossProfit: coerceNumber(value.grossProfit),
    grossLoss: coerceNumber(value.grossLoss),
  };
}
