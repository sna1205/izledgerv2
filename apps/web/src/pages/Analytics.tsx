import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { AccountFilterSelect } from "@/components/AccountFilterSelect";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { BreakdownDrawer, buildBreakdownDrawerStats } from "@/components/analytics/BreakdownDrawer";
import { BreakdownChartTooltip } from "@/components/analytics/ChartTooltip";
import { EmptyChartState } from "@/components/analytics/EmptyChartState";
import { AnalyticsSkeleton } from "@/components/skeletons/AnalyticsSkeleton";
import { CalendarCell } from "@/components/CalendarCell";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard, SectionHeader } from "@/components/PageShell";
import { StatCard } from "@/components/StatCard";
import { TradingDayDrawer } from "@/components/TradingDayDrawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataBadge } from "@/components/DataBadge";
import { listAccounts } from "@/lib/api/accounts";
import { getAnalyticsBreakdowns, getAnalyticsCalendar } from "@/lib/api/analytics";
import { type ListTradesParams, listTrades } from "@/lib/api/trades";
import { resolveAccountFilter, useAccountFilter } from "@/lib/account-filter";
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  formatNumberDisplay,
  formatPercentageDisplay,
  normalizeAnalyticsBreakdownsResponse,
  normalizeAnalyticsCalendarResponse,
  normalizeMonthKey,
  shiftMonthKey,
  type NormalizedBreakdownRow,
} from "@/lib/analytics-rendering";
import { useAuth } from "@/lib/auth";
import { withMinimumDelay } from "@/lib/loading";
import { getPageErrorState } from "@/lib/page-errors";
import { privateQueryKey } from "@/lib/react-query";
import type { Result, Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

type BreakdownDrawerState = {
  kind: "account" | "pair" | "emotion" | "session" | "outcome" | "risk";
  title: string;
  description: string;
  params?: ListTradesParams;
  trades?: Trade[];
};

const POSITIVE_BAR = "#34d399";
const NEGATIVE_BAR = "#fb7185";
const ACCENT_BAR = "#60a5fa";
const NEUTRAL_BAR = "#94a3b8";
const GRID_STROKE = "hsl(var(--border) / 0.4)";
const AXIS_TEXT = "hsl(var(--muted-foreground))";
const REFERENCE_LINE = "hsl(var(--border) / 0.8)";
const CURSOR_FILL = "hsl(var(--accent) / 0.35)";
const DONUT_STROKE = "hsl(var(--card))";
const DONUT_VALUE_FILL = "hsl(var(--foreground))";
const DONUT_LABEL_FILL = "hsl(var(--muted-foreground))";

function getProfitTone(value: number) {
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-foreground";
}

function calculatePlannedRR(trade: Trade) {
  const reward = trade.direction === "Buy"
    ? trade.takeProfit - trade.entry
    : trade.entry - trade.takeProfit;
  const risk = trade.direction === "Buy"
    ? trade.entry - trade.stopLoss
    : trade.stopLoss - trade.entry;

  if (risk <= 0) {
    return 0;
  }

  return Math.max(0, reward / risk);
}

function shortenLabel(label: string, maxLength = 12) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function sortRowsDescending<T extends { profit: number }>(rows: T[]) {
  return [...rows].sort((a, b) => b.profit - a.profit);
}

function buildGenericInsights(rows: Array<{ label: string; trades: number; profit: number }>, bestPrefix: string, worstPrefix: string) {
  const sorted = sortRowsDescending(rows);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const totalTrades = rows.reduce((sum, row) => sum + row.trades, 0);

  if (rows.length === 0) {
    return [
      "No data yet.",
      "Start logging trades.",
      "Total trades: 0",
    ];
  }

  return [
    `${bestPrefix}: ${best.label} (${formatCurrencyDisplay(best.profit)})`,
    `${worstPrefix}: ${worst.label} (${formatCurrencyDisplay(worst.profit)})`,
    `Total trades: ${formatNumberDisplay(totalTrades)}`,
  ];
}

function createPerformanceDataset(rows: NormalizedBreakdownRow[]) {
  return rows.map((row) => ({
    ...row,
    shortLabel: shortenLabel(row.label),
  }));
}

function buildRiskDistribution(trades: Trade[]) {
  const buckets = [
    { key: "under-1", label: "<1R", trades: 0 },
    { key: "one-to-two", label: "1R-2R", trades: 0 },
    { key: "two-to-three", label: "2R-3R", trades: 0 },
    { key: "over-three", label: "3R+", trades: 0 },
  ];

  trades.forEach((trade) => {
    const rr = calculatePlannedRR(trade);

    if (rr < 1) {
      buckets[0].trades += 1;
      return;
    }

    if (rr < 2) {
      buckets[1].trades += 1;
      return;
    }

    if (rr < 3) {
      buckets[2].trades += 1;
      return;
    }

    buckets[3].trades += 1;
  });

  const total = trades.length;

  return buckets.map((bucket) => ({
    ...bucket,
    share: total > 0 ? (bucket.trades / total) * 100 : 0,
  }));
}

function getOutcomeResult(name: string): Result {
  return name.toLowerCase().includes("win") ? "Win" : "Loss";
}

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const [currentMonth, setCurrentMonth] = useState(() => normalizeMonthKey(null));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "breakdowns" | "calendar">("overview");
  const [breakdownDrawer, setBreakdownDrawer] = useState<BreakdownDrawerState | null>(null);

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts"),
    queryFn: async () => {
      const response = await listAccounts();
      return response.items;
    },
  });

  const accounts = accountsQuery.data;
  const resolvedAccountFilter = useMemo(
    () => resolveAccountFilter(accountFilter, accounts ?? []),
    [accountFilter, accounts],
  );

  useEffect(() => {
    const normalizedMonth = normalizeMonthKey(currentMonth);

    if (normalizedMonth !== currentMonth) {
      setCurrentMonth(normalizedMonth);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (resolvedAccountFilter !== accountFilter) {
      setAccountFilter(resolvedAccountFilter);
    }
  }, [accountFilter, resolvedAccountFilter, setAccountFilter]);

  useEffect(() => {
    setSelectedDayKey(null);
    setBreakdownDrawer(null);
  }, [resolvedAccountFilter, currentMonth]);

  const accountId = resolvedAccountFilter === "all" ? undefined : resolvedAccountFilter;
  const normalizedCurrentMonth = useMemo(() => normalizeMonthKey(currentMonth), [currentMonth]);

  const breakdownsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "analytics-breakdowns", accountId ?? "all"),
    queryFn: async () => normalizeAnalyticsBreakdownsResponse(
      await withMinimumDelay(() => getAnalyticsBreakdowns(accountId)),
    ),
  });

  const detailedTradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "analytics-breakdown-detailed-trades", accountId ?? "all"),
    enabled: activeTab === "breakdowns",
    queryFn: async () => {
      const response = await withMinimumDelay(() => listTrades({
        accountId,
        page: 1,
        pageSize: 500,
        sortBy: "date",
        sortOrder: "desc",
      }));

      return response.items;
    },
  });

  const calendarQuery = useQuery({
    queryKey: privateQueryKey(user.id, "analytics-calendar", accountId ?? "all", normalizedCurrentMonth),
    queryFn: async () => normalizeAnalyticsCalendarResponse(
      await withMinimumDelay(() => getAnalyticsCalendar(normalizedCurrentMonth, accountId)),
      normalizedCurrentMonth,
    ),
  });

  const calendar = calendarQuery.data ?? normalizeAnalyticsCalendarResponse(null, normalizedCurrentMonth);
  const selectedDay = calendar.days.find((day) => day.key === selectedDayKey) ?? null;

  const dayTradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "analytics-calendar-day-trades", accountId ?? "all", selectedDay?.date ?? "none"),
    enabled: Boolean(selectedDay),
    queryFn: async () => {
      if (!selectedDay) {
        return [];
      }

      const response = await withMinimumDelay(() => listTrades({
        accountId,
        dateFrom: selectedDay.date,
        dateTo: selectedDay.date,
        page: 1,
        pageSize: 100,
        sortBy: "date",
        sortOrder: "desc",
      }));

      return response.items;
    },
  });

  const breakdownDrawerQuery = useQuery({
    queryKey: privateQueryKey(user.id, "analytics-breakdown-drawer", breakdownDrawer?.kind ?? "none", breakdownDrawer?.title ?? "none", JSON.stringify(breakdownDrawer?.params ?? {})),
    enabled: Boolean(breakdownDrawer && !breakdownDrawer.trades),
    queryFn: async () => {
      if (!breakdownDrawer?.params) {
        return [];
      }

      const response = await withMinimumDelay(() => listTrades({
        page: 1,
        pageSize: 100,
        sortBy: "date",
        sortOrder: "desc",
        ...breakdownDrawer.params,
      }));

      return response.items;
    },
  });

  const dayTrades = dayTradesQuery.data ?? [];
  const allDetailedTrades = detailedTradesQuery.data ?? [];

  const dayStats = useMemo(() => {
    const bestTrade = dayTrades.reduce<Trade | null>((best, trade) => (best === null || trade.profit > best.profit ? trade : best), null);
    const worstTrade = dayTrades.reduce<Trade | null>((worst, trade) => (worst === null || trade.profit < worst.profit ? trade : worst), null);
    const avgRR = dayTrades.length > 0
      ? dayTrades.reduce((sum, trade) => sum + calculatePlannedRR(trade), 0) / dayTrades.length
      : 0;

    return {
      stats: [
        { label: "Win Rate", value: selectedDay ? formatPercentageDisplay(selectedDay.winRate) : "0.0%" },
        { label: "Avg RR", value: `1:${formatNumberDisplay(avgRR, { minimumFractionDigits: 2 })}` },
        {
          label: "Best Trade",
          value: bestTrade ? formatCurrencyDisplay(bestTrade.profit) : "$0.00",
          tone: bestTrade && bestTrade.profit > 0 ? "success" : "default",
        },
        {
          label: "Worst Trade",
          value: worstTrade ? formatCurrencyDisplay(worstTrade.profit) : "$0.00",
          tone: worstTrade && worstTrade.profit < 0 ? "danger" : "default",
        },
      ] as Array<{ label: string; value: string; tone?: "default" | "success" | "danger" }>,
      sessions: Array.from(new Set(dayTrades.map((trade) => trade.session).filter(Boolean))) as string[],
      emotions: Array.from(new Set(dayTrades.map((trade) => trade.emotion).filter(Boolean))) as string[],
    };
  }, [dayTrades, selectedDay]);

  if ((breakdownsQuery.isLoading && !breakdownsQuery.data) || (calendarQuery.isLoading && !calendarQuery.data)) {
    return <AnalyticsSkeleton />;
  }

  if (breakdownsQuery.isError || calendarQuery.isError) {
    const pageError = getPageErrorState(breakdownsQuery.error ?? calendarQuery.error, {
      unavailableTitle: "Analytics unavailable",
      unavailableDescription: "The analytics service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session is not allowed to view analytics right now.",
      validationTitle: "Analytics request invalid",
      validationDescription: "The analytics filters or month selection are invalid.",
      timeoutTitle: "Analytics request timed out",
      timeoutDescription: "Loading analytics took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={pageError.title}
        description={pageError.description}
        onRetry={pageError.allowRetry ? () => {
          void Promise.all([breakdownsQuery.refetch(), calendarQuery.refetch()]);
        } : undefined}
        isRetrying={breakdownsQuery.isFetching || calendarQuery.isFetching}
      />
    );
  }

  const breakdowns = breakdownsQuery.data ?? normalizeAnalyticsBreakdownsResponse(null);

  const accountRows = createPerformanceDataset(sortRowsDescending(breakdowns.accountPerformance));
  const pairRows = createPerformanceDataset(sortRowsDescending(breakdowns.pairPerformance));
  const emotionRows = createPerformanceDataset(sortRowsDescending(breakdowns.emotionPerformance));
  const sessionRows = createPerformanceDataset(sortRowsDescending(breakdowns.sessionPerformance));
  const outcomeRows = breakdowns.winLoss.map((entry, index) => ({
    ...entry,
    fill: index === 0 ? POSITIVE_BAR : NEGATIVE_BAR,
  }));
  const riskDistribution = buildRiskDistribution(allDetailedTrades);
  const bestSession = sessionRows[0]?.label;
  const dominantOutcome = outcomeRows.reduce<(typeof outcomeRows)[number] | null>((winner, entry) => {
    if (winner === null || entry.value > winner.value) {
      return entry;
    }

    return winner;
  }, null);
  const averageRR = allDetailedTrades.length > 0
    ? allDetailedTrades.reduce((sum, trade) => sum + calculatePlannedRR(trade), 0) / allDetailedTrades.length
    : breakdowns.summary.avgRR;
  const mostCommonRiskBucket = riskDistribution.reduce<(typeof riskDistribution)[number] | null>((winner, bucket) => {
    if (winner === null || bucket.trades > winner.trades) {
      return bucket;
    }

    return winner;
  }, null);

  const drawerTrades = breakdownDrawer?.trades ?? breakdownDrawerQuery.data ?? [];
  const drawerStats = buildBreakdownDrawerStats(drawerTrades);

  return (
    <>
      <PageShell size="wide">
      <PageHeader
          title="Analytics"
          actions={(
            <AccountFilterSelect
              accounts={accounts ?? []}
              value={resolvedAccountFilter}
              onValueChange={setAccountFilter}
              triggerClassName="h-11 rounded-2xl min-w-[220px]"
            />
          )}
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "breakdowns" | "calendar")} className="w-full">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="grid h-auto w-full grid-cols-3 sm:max-w-[360px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdowns">Breakdown</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>

            <div className="surface-muted flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
              <span>{formatNumberDisplay(breakdowns.summary.totalTrades)} trades tracked</span>
              <span className="hidden h-4 w-px bg-border/80 sm:block" />
              <span>{formatCurrencyDisplay(breakdowns.summary.totalProfit)} net</span>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Trades" value={String(breakdowns.summary.totalTrades)} icon={Layers3} />
              <StatCard label="Win Rate" value={formatPercentageDisplay(breakdowns.summary.winRate)} icon={TrendingUp} />
              <StatCard label="Avg RR" value={`1:${formatNumberDisplay(breakdowns.summary.avgRR, { minimumFractionDigits: 2 })}`} icon={Radar} />
              <StatCard
                label="Net PnL"
                value={formatCurrencyDisplay(breakdowns.summary.totalProfit)}
                tone={breakdowns.summary.totalProfit > 0 ? "positive" : breakdowns.summary.totalProfit < 0 ? "negative" : "default"}
                icon={Sparkles}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionCard className="h-full">
                <SectionHeader title="Setup Performance" />
                <div className="mt-5 space-y-3">
                  {breakdowns.setupPerformance.slice(0, 6).map((row) => (
                    <div key={row.key} className="surface-muted flex items-start justify-between gap-4 px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{row.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatNumberDisplay(row.trades)} trades • {formatPercentageDisplay(row.winRate)} win rate
                        </p>
                      </div>
                      <p className={cn("text-sm font-semibold", getProfitTone(row.profit))}>
                        {formatCurrencyDisplay(row.profit)}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="h-full">
                <SectionHeader title="Session Performance" />
                <div className="mt-5 space-y-3">
                  {breakdowns.sessionPerformance.slice(0, 6).map((row) => (
                    <div key={row.key} className="surface-muted flex items-start justify-between gap-4 px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{row.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatNumberDisplay(row.trades)} trades • {formatPercentageDisplay(row.winRate)} win rate
                        </p>
                      </div>
                      <p className={cn("text-sm font-semibold", getProfitTone(row.profit))}>
                        {formatCurrencyDisplay(row.profit)}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="h-full">
                <SectionHeader title="Emotion Performance" />
                <div className="mt-5 space-y-3">
                  {breakdowns.emotionPerformance.slice(0, 6).map((row) => (
                    <div key={row.key} className="surface-muted flex items-start justify-between gap-4 px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{row.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatNumberDisplay(row.trades)} trades • {formatPercentageDisplay(row.winRate)} win rate
                        </p>
                      </div>
                      <p className={cn("text-sm font-semibold", getProfitTone(row.profit))}>
                        {formatCurrencyDisplay(row.profit)}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="breakdowns" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsCard
                title="Account Performance"
                delay={0}
                insights={buildGenericInsights(accountRows, "Best account", "Weakest account")}
              >
                {accountRows.length === 0 ? (
                  <EmptyChartState />
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accountRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <filter id="account-glow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={ACCENT_BAR} floodOpacity="0.45" />
                          </filter>
                        </defs>
                        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                        <XAxis dataKey="shortLabel" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactCurrencyDisplay(value)} />
                        <ReferenceLine y={0} stroke={REFERENCE_LINE} />
                        <Tooltip content={<BreakdownChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
                        <Bar dataKey="profit" radius={[12, 12, 0, 0]} onClick={(data) => {
                          setBreakdownDrawer({
                            kind: "account",
                            title: data.label,
                            description: `Inspect the trades contributing to ${data.label}'s account performance.`,
                            params: {
                              accountId: data.accountId,
                            },
                          });
                        }}>
                          {accountRows.map((row, index) => (
                            <Cell
                              key={row.key}
                              fill={row.profit >= 0 ? POSITIVE_BAR : NEGATIVE_BAR}
                              filter={index === 0 && row.profit > 0 ? "url(#account-glow)" : undefined}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Pair Performance"
                delay={0.05}
                insights={buildGenericInsights(pairRows, "Best pair", "Worst pair")}
              >
                {pairRows.length === 0 ? (
                  <EmptyChartState />
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pairRows} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                        <XAxis type="number" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactCurrencyDisplay(value)} />
                        <YAxis type="category" dataKey="label" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
                        <ReferenceLine x={0} stroke={REFERENCE_LINE} />
                        <Tooltip content={<BreakdownChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
                        <Bar dataKey="profit" radius={[0, 12, 12, 0]} onClick={(data) => {
                          setBreakdownDrawer({
                            kind: "pair",
                            title: data.label,
                            description: `Every ${data.label} trade included in your current analytics filter.`,
                            params: {
                              accountId,
                              pair: data.label,
                            },
                          });
                        }}>
                          {pairRows.map((row) => (
                            <Cell key={row.key} fill={row.profit >= 0 ? POSITIVE_BAR : NEGATIVE_BAR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Emotion Performance"
                delay={0.1}
                insights={[
                  ...buildGenericInsights(emotionRows, "Best emotion", "Worst emotion").slice(0, 2),
                  emotionRows.length > 0
                    ? `${emotionRows[0].label} trades show ${formatPercentageDisplay(emotionRows[0].winRate)} win rate`
                    : "Total trades: 0",
                ]}
              >
                {emotionRows.length === 0 ? (
                  <EmptyChartState />
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={emotionRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                        <XAxis dataKey="shortLabel" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactCurrencyDisplay(value)} />
                        <ReferenceLine y={0} stroke={REFERENCE_LINE} />
                        <Tooltip content={<BreakdownChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
                        <Bar dataKey="profit" radius={[12, 12, 0, 0]} onClick={(data) => {
                          setBreakdownDrawer({
                            kind: "emotion",
                            title: data.label,
                            description: `Trades tagged with ${data.label} so you can see whether this emotional state is helping or hurting.`,
                            params: {
                              accountId,
                              emotion: data.label,
                            },
                          });
                        }}>
                          {emotionRows.map((row) => (
                            <Cell key={row.key} fill={row.profit >= 0 ? POSITIVE_BAR : NEGATIVE_BAR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Session Performance"
                delay={0.15}
                insights={[
                  sessionRows.length > 0
                    ? `Best session: ${sessionRows[0].label} (${formatCurrencyDisplay(sessionRows[0].profit)})`
                    : "No data yet. Start logging trades to unlock insights.",
                  sessionRows.length > 0
                    ? `${sessionRows[0].label} carries ${formatPercentageDisplay(sessionRows[0].winRate)} win rate`
                    : "The chart structure is ready for your next sample size.",
                  `Total trades: ${formatNumberDisplay(sessionRows.reduce((sum, row) => sum + row.trades, 0))}`,
                ]}
              >
                {sessionRows.length === 0 ? (
                  <EmptyChartState />
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <filter id="session-glow" x="-40%" y="-40%" width="180%" height="180%">
                            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor={ACCENT_BAR} floodOpacity="0.55" />
                          </filter>
                        </defs>
                        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                        <XAxis dataKey="shortLabel" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactCurrencyDisplay(value)} />
                        <ReferenceLine y={0} stroke={REFERENCE_LINE} />
                        <Tooltip content={<BreakdownChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
                        <Bar dataKey="profit" radius={[12, 12, 0, 0]} onClick={(data) => {
                          setBreakdownDrawer({
                            kind: "session",
                            title: data.label,
                            description: `Trades taken during the ${data.label} session for deeper pattern review.`,
                            params: {
                              accountId,
                              session: data.label,
                            },
                          });
                        }}>
                          {sessionRows.map((row) => (
                            <Cell
                              key={row.key}
                              fill={row.label === bestSession ? ACCENT_BAR : row.profit >= 0 ? POSITIVE_BAR : NEGATIVE_BAR}
                              filter={row.label === bestSession ? "url(#session-glow)" : undefined}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Outcome Split"
                delay={0.2}
                insights={[
                  dominantOutcome
                    ? `Dominant outcome: ${dominantOutcome.name} (${formatPercentageDisplay(dominantOutcome.percentage)})`
                    : "No data yet. Start logging trades to unlock insights.",
                  `Win rate: ${formatPercentageDisplay(breakdowns.summary.winRate)}`,
                  `Total trades: ${formatNumberDisplay(breakdowns.summary.totalTrades)}`,
                ]}
              >
                {outcomeRows.length === 0 ? (
                  <EmptyChartState variant="donut" />
                ) : (
                  <div className="flex h-[280px] flex-col items-center justify-center">
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<BreakdownChartTooltip mode="outcome" />} />
                          <Pie
                            data={outcomeRows}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={68}
                            outerRadius={94}
                            paddingAngle={4}
                            stroke={DONUT_STROKE}
                            strokeWidth={6}
                            onClick={(data) => {
                              setBreakdownDrawer({
                                kind: "outcome",
                                title: data.name,
                                description: `Trades ending as ${data.name.toLowerCase()} under the current analytics filter.`,
                                params: {
                                  accountId,
                                  result: getOutcomeResult(data.name),
                                },
                              });
                            }}
                          >
                            {outcomeRows.map((entry) => (
                              <Cell key={entry.key} fill={entry.fill} />
                            ))}
                          </Pie>
                          <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill={DONUT_VALUE_FILL} fontSize="28" fontWeight="600">
                            {formatPercentageDisplay(breakdowns.summary.winRate)}
                          </text>
                          <text x="50%" y="59%" textAnchor="middle" dominantBaseline="middle" fill={DONUT_LABEL_FILL} fontSize="12">
                            Win rate
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Total trades: {formatNumberDisplay(breakdowns.summary.totalTrades)}
                    </p>
                  </div>
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Risk / Reward Distribution"
                delay={0.25}
                insights={[
                  mostCommonRiskBucket
                    ? `Most common bucket: ${mostCommonRiskBucket.label} (${formatNumberDisplay(mostCommonRiskBucket.trades)} trades)`
                    : "No data yet.",
                  `Average planned RR: 1:${formatNumberDisplay(averageRR, { minimumFractionDigits: 2 })}`,
                  `Sample size: ${formatNumberDisplay(allDetailedTrades.length)} trades`,
                ]}
              >
                {riskDistribution.every((bucket) => bucket.trades === 0) ? (
                  <EmptyChartState />
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskDistribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                        <XAxis dataKey="label" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<BreakdownChartTooltip mode="distribution" />} cursor={{ fill: CURSOR_FILL }} />
                        <Bar dataKey="trades" radius={[12, 12, 0, 0]} fill={ACCENT_BAR} onClick={(data) => {
                          const filteredTrades = allDetailedTrades.filter((trade) => {
                            const rr = calculatePlannedRR(trade);

                            if (data.key === "under-1") return rr < 1;
                            if (data.key === "one-to-two") return rr >= 1 && rr < 2;
                            if (data.key === "two-to-three") return rr >= 2 && rr < 3;
                            return rr >= 3;
                          });

                          setBreakdownDrawer({
                            kind: "risk",
                            title: data.label,
                            description: `Trades whose planned reward-to-risk falls into the ${data.label} bucket.`,
                            trades: filteredTrades,
                          });
                        }}>
                          {riskDistribution.map((bucket, index) => (
                            <Cell key={bucket.key} fill={index === 0 ? NEUTRAL_BAR : ACCENT_BAR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AnalyticsCard>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <SectionCard>
              <SectionHeader
                title={calendar.monthLabel}
                action={(
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(shiftMonthKey(normalizedCurrentMonth, -1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(shiftMonthKey(normalizedCurrentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              />

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="surface-muted px-4 py-4">
                  <p className="text-label mb-2">Month PnL</p>
                  <p className={cn("font-mono-price text-2xl font-semibold", getProfitTone(calendar.summary.totalProfit))}>
                    {formatCurrencyDisplay(calendar.summary.totalProfit)}
                  </p>
                </div>
                <div className="surface-muted px-4 py-4">
                  <p className="text-label mb-2">Trades</p>
                  <p className="text-2xl font-semibold text-foreground">{formatNumberDisplay(calendar.summary.totalTrades)}</p>
                </div>
                <div className="surface-muted px-4 py-4">
                  <p className="text-label mb-2">Win Rate</p>
                  <p className="text-2xl font-semibold text-foreground">{formatPercentageDisplay(calendar.summary.winRate)}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <div className="mb-4 grid grid-cols-7 gap-2 pr-0 text-center text-[11px] font-medium uppercase tracking-[0.26em] text-muted-foreground lg:pr-[220px]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="space-y-3">
                {calendar.weeks.map((week, index) => (
                  <div key={week.key ?? index} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-stretch">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                      {week.days.map((day) => (
                        <CalendarCell
                          key={day.key}
                          day={day}
                          selected={selectedDayKey === day.key}
                          onClick={() => setSelectedDayKey(day.key)}
                        />
                      ))}
                    </div>

                    <div className="surface-muted flex flex-col justify-between px-4 py-4">
                      <div>
                        <p className="text-label mb-2">Weekly Summary</p>
                        <p className={cn("font-mono-price text-xl font-semibold", getProfitTone(week.summary.totalProfit))}>
                          {formatCurrencyDisplay(week.summary.totalProfit)}
                        </p>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <p>{formatPercentageDisplay(week.summary.winRate)} win rate</p>
                        <p>{formatNumberDisplay(week.summary.tradeCount)} trades</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {calendar.weeks.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    icon={BarChart3}
                    title="No data yet"
                    description="Log trades to populate the calendar."
                  />
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <DataBadge tone="success">Green = profitable day</DataBadge>
                <DataBadge tone="danger">Red = losing day</DataBadge>
                <DataBadge>Neutral = no trades</DataBadge>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </PageShell>

      <TradingDayDrawer
        day={selectedDay}
        trades={dayTrades}
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDayKey(null)}
        onTradeClick={(tradeId) => navigate(`/trades/${tradeId}`)}
        onViewDayAnalysis={() => navigate("/trades")}
        onAddReview={() => navigate("/reviews")}
        stats={dayStats.stats}
        sessions={dayStats.sessions}
        emotions={dayStats.emotions}
      />

      <BreakdownDrawer
        open={Boolean(breakdownDrawer)}
        title={breakdownDrawer?.title ?? ""}
        description={breakdownDrawer?.description ?? ""}
        stats={drawerStats}
        trades={drawerTrades}
        loading={breakdownDrawerQuery.isLoading}
        onClose={() => setBreakdownDrawer(null)}
        onTradeClick={(tradeId) => navigate(`/trades/${tradeId}`)}
        onViewAllTrades={() => navigate("/trades")}
      />
    </>
  );
}
