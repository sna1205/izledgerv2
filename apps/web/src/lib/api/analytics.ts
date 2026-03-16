import { apiFetch } from "@/lib/api/client";
import type { Trade } from "@/lib/types";

type DashboardSummary = {
  summary: {
    todayTrades: number;
    totalTrades: number;
    winRate: number;
    totalProfit: number;
  };
  recentTrades: Trade[];
  equityCurve: Array<{
    tradeNumber: number;
    date: string;
    pair: string;
    profit: number;
    equity: number;
  }>;
};

type BreakdownRow = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  winRate: number;
  profit: number;
  averageProfit: number;
};

type AnalyticsBreakdowns = {
  summary: {
    totalTrades: number;
    wins: number;
    losses: number;
    totalProfit: number;
    totalGross: number;
    totalLoss: number;
    winRate: number;
    avgRR: number;
  };
  winLoss: Array<{
    key: string;
    name: string;
    value: number;
    percentage: number;
  }>;
  setupPerformance: BreakdownRow[];
  sessionPerformance: BreakdownRow[];
  emotionPerformance: BreakdownRow[];
  pairPerformance: BreakdownRow[];
  accountPerformance: Array<BreakdownRow & { accountId: string }>;
};

type CalendarDay = {
  date: string;
  inCurrentMonth: boolean;
  totalProfit: number;
  tradeCount: number;
  wins: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
};

type AnalyticsCalendar = {
  month: string;
  days: CalendarDay[];
  weeks: Array<{
    days: CalendarDay[];
    summary: {
      tradeCount: number;
      totalProfit: number;
      winRate: number;
    };
  }>;
};

function buildAccountQuery(accountId?: string) {
  if (!accountId) {
    return "";
  }

  return `?accountId=${encodeURIComponent(accountId)}`;
}

export function getDashboardSummary(accountId?: string) {
  return apiFetch<DashboardSummary>(`/dashboard/summary${buildAccountQuery(accountId)}`);
}

export function getAnalyticsBreakdowns(accountId?: string) {
  return apiFetch<AnalyticsBreakdowns>(`/analytics/breakdowns${buildAccountQuery(accountId)}`);
}

export function getAnalyticsCalendar(month: string, accountId?: string) {
  const query = new URLSearchParams({ month });

  if (accountId) {
    query.set("accountId", accountId);
  }

  return apiFetch<AnalyticsCalendar>(`/analytics/calendar?${query.toString()}`);
}
