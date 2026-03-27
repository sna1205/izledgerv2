import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useNavigate } from "react-router-dom";
import { AccountFilterSelect } from "@/features/accounts/components/AccountFilterSelect";
import {
  EmotionsBreakdownChart,
  getBreakdownCategoryAccent,
  PairsBreakdownChart,
  SessionsBreakdownChart,
  SetupsBreakdownChart,
} from "@/features/analytics/components/BreakdownCharts";
import { BreakdownDrawer, buildBreakdownDrawerStats } from "@/features/analytics/components/BreakdownDrawer";
import { EmptyChartState } from "@/features/analytics/components/EmptyChartState";
import { AnalyticsSkeleton } from "@/components/skeletons/AnalyticsSkeleton";
import { CalendarCell } from "@/components/CalendarCell";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard, SectionHeader } from "@/layouts/PageShell";
import { TradingDayDrawer } from "@/features/trades/components/TradingDayDrawer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAccounts } from "@/services/api/accounts";
import { getAnalyticsBreakdowns, getAnalyticsCalendar } from "@/services/api/analytics";
import { listTrades } from "@/services/api/trades";
import { resolveAccountFilter, useAccountFilter } from "@/utils/account-filter";
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  formatDateDisplay,
  formatNumberDisplay,
  formatPercentageDisplay,
  normalizeAnalyticsBreakdownsResponse,
  normalizeAnalyticsCalendarResponse,
  normalizeMonthKey,
  shiftMonthKey,
  type NormalizedCalendarDay,
  type NormalizedBreakdownRow,
} from "@/utils/analytics-rendering";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import { privateQueryKey } from "@/services/query-client";
import type { Trade } from "@/types";
import { cn } from "@/utils/class-names";

type MainTab = "overview" | "breakdowns" | "calendar";
type BreakdownTab = "setups" | "pairs" | "sessions" | "emotions";
type BreakdownKind = "setup" | "pair" | "emotion" | "session";

type BreakdownDrawerState = {
  kind: BreakdownKind;
  title: string;
  description: string;
  label: string;
};

type PerformanceRow = NormalizedBreakdownRow & {
  shortLabel: string;
};

type TrendPoint = {
  key: string;
  date: string;
  shortDate: string;
  fullDate: string;
  cumulativeProfit: number;
  dailyProfit: number;
  trades: number;
};

type DailySummary = {
  date: string;
  fullDate: string;
  trades: number;
  profit: number;
};

type BreakdownDefinition = {
  key: BreakdownTab;
  label: string;
  description: string;
  rows: PerformanceRow[];
  kind: BreakdownKind;
};

const ACCENT_LINE = "#6e98c7";
const GRID_STROKE = "hsl(var(--border) / 0.35)";
const AXIS_TEXT = "hsl(var(--muted-foreground))";
const REFERENCE_LINE = "hsl(var(--border) / 0.8)";
const CURSOR_FILL = "hsl(var(--accent) / 0.32)";
const ANALYTICS_EMPTY_MESSAGE = "Add trades to unlock insights.";
const EMPTY_TRADES: Trade[] = [];
const ANALYTICS_TRADE_PAGE_SIZE = 100;

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

function shortenLabel(label: string, maxLength = 14) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function sortRowsByProfit<T extends { profit: number }>(rows: T[]) {
  return [...rows].sort((a, b) => b.profit - a.profit);
}

function sortRowsByTrades<T extends { trades: number; profit: number }>(rows: T[]) {
  return [...rows].sort((a, b) => b.trades - a.trades || b.profit - a.profit);
}

function createPerformanceDataset(rows: NormalizedBreakdownRow[]) {
  return rows.map((row) => ({
    ...row,
    shortLabel: shortenLabel(row.label),
  }));
}

function pickBestRow(rows: PerformanceRow[]) {
  return [...rows].sort((left, right) => right.profit - left.profit || right.winRate - left.winRate || right.trades - left.trades)[0] ?? null;
}

function pickWorstRow(rows: PerformanceRow[]) {
  return [...rows].sort((left, right) => left.profit - right.profit || left.winRate - right.winRate || right.trades - left.trades)[0] ?? null;
}

function pickMostTradedRow(rows: PerformanceRow[]) {
  return sortRowsByTrades(rows)[0] ?? null;
}

function buildTrendSeries(trades: Trade[]) {
  const orderedTrades = [...trades].sort((left, right) => left.date.localeCompare(right.date));
  const grouped = new Map<string, { profit: number; trades: number }>();

  for (const trade of orderedTrades) {
    const current = grouped.get(trade.date) ?? { profit: 0, trades: 0 };
    current.profit += trade.profit;
    current.trades += 1;
    grouped.set(trade.date, current);
  }

  let cumulativeProfit = 0;

  return Array.from(grouped.entries()).map(([date, value]) => {
    cumulativeProfit += value.profit;

    return {
      key: date,
      date,
      shortDate: formatDateDisplay(date, {
        fallback: date,
        formatter: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }),
      }),
      fullDate: formatDateDisplay(date),
      cumulativeProfit,
      dailyProfit: value.profit,
      trades: value.trades,
    };
  });
}

function buildDailySummaries(trades: Trade[]): DailySummary[] {
  return buildTrendSeries(trades).map((point) => ({
    date: point.date,
    fullDate: point.fullDate,
    trades: point.trades,
    profit: point.dailyProfit,
  }));
}

function buildTrendSeriesFromCalendar(days: NormalizedCalendarDay[]) {
  const activeDays = [...days]
    .filter((day) => day.inCurrentMonth && day.tradeCount > 0)
    .sort((left, right) => left.date.localeCompare(right.date));

  let cumulativeProfit = 0;

  return activeDays.map((day) => {
    cumulativeProfit += day.totalProfit;

    return {
      key: day.key,
      date: day.date,
      shortDate: formatDateDisplay(day.date, {
        fallback: day.date,
        formatter: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }),
      }),
      fullDate: formatDateDisplay(day.date),
      cumulativeProfit,
      dailyProfit: day.totalProfit,
      trades: day.tradeCount,
    };
  });
}

function buildDailySummariesFromCalendar(days: NormalizedCalendarDay[]): DailySummary[] {
  return buildTrendSeriesFromCalendar(days).map((point) => ({
    date: point.date,
    fullDate: point.fullDate,
    trades: point.trades,
    profit: point.dailyProfit,
  }));
}

function buildBehaviorInsight(dailySummaries: DailySummary[]) {
  if (dailySummaries.length === 0) {
    return "More trades needed for behavior insight.";
  }

  const averageTradesPerDay = dailySummaries.reduce((sum, day) => sum + day.trades, 0) / dailySummaries.length;
  const busiestDay = [...dailySummaries].sort((left, right) => right.trades - left.trades || left.profit - right.profit)[0];

  if (busiestDay && busiestDay.trades >= Math.max(4, Math.ceil(averageTradesPerDay * 1.75))) {
    return busiestDay.profit < 0
      ? `${busiestDay.fullDate} was your busiest day and closed ${formatCurrencyDisplay(busiestDay.profit)}.`
      : `${busiestDay.fullDate} had your most trades. Watch quality when volume rises.`;
  }

  const losingDays = dailySummaries.filter((day) => day.profit < 0).length;

  if (losingDays > dailySummaries.length / 2) {
    return `${formatNumberDisplay(losingDays)} of ${formatNumberDisplay(dailySummaries.length)} active days closed red.`;
  }

  const positiveDays = dailySummaries.filter((day) => day.profit > 0).length;
  return `${formatNumberDisplay(positiveDays)} of ${formatNumberDisplay(dailySummaries.length)} active days closed green.`;
}

function computeMaxDrawdown(points: TrendPoint[]) {
  let peak = Number.NEGATIVE_INFINITY;
  let maxDrawdown = 0;

  for (const point of points) {
    peak = Math.max(peak, point.cumulativeProfit);
    maxDrawdown = Math.max(maxDrawdown, peak - point.cumulativeProfit);
  }

  return maxDrawdown;
}

function buildPerformanceScore({
  winRate,
  avgRR,
  dailySummaries,
  trend,
  totalGross,
}: {
  winRate: number;
  avgRR: number;
  dailySummaries: DailySummary[];
  trend: TrendPoint[];
  totalGross: number;
}) {
  const consistencyScore = dailySummaries.length > 0
    ? (dailySummaries.filter((day) => day.profit > 0).length / dailySummaries.length) * 100
    : 0;
  const rrScore = Math.min(100, (avgRR / 3) * 100);
  const maxDrawdown = computeMaxDrawdown(trend);
  const drawdownScore = totalGross > 0
    ? Math.max(0, 100 - (maxDrawdown / totalGross) * 100)
    : 0;
  const score = Math.round(
    (winRate * 0.35)
    + (rrScore * 0.25)
    + (consistencyScore * 0.2)
    + (drawdownScore * 0.2),
  );

  return {
    score,
    factors: [
      { label: "Win rate", value: Math.round(winRate) },
      { label: "Risk / reward", value: Math.round(rrScore) },
      { label: "Consistency", value: Math.round(consistencyScore) },
      { label: "Drawdown control", value: Math.round(drawdownScore) },
    ],
    maxDrawdown,
  };
}

function buildAnalyticsSummaryFromTrades(trades: Trade[]) {
  const totalTrades = trades.length;
  const wins = trades.filter((trade) => trade.result === "Win").length;
  const losses = trades.filter((trade) => trade.result === "Loss").length;
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const totalGross = trades
    .filter((trade) => trade.profit > 0)
    .reduce((sum, trade) => sum + trade.profit, 0);
  const totalLoss = trades
    .filter((trade) => trade.profit < 0)
    .reduce((sum, trade) => sum + trade.profit, 0);
  const rrValues = trades
    .map((trade) => calculatePlannedRR(trade))
    .filter((value) => value > 0);

  return {
    totalTrades,
    wins,
    losses,
    totalProfit,
    totalGross,
    totalLoss,
    winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    avgRR: rrValues.length > 0
      ? rrValues.reduce((sum, value) => sum + value, 0) / rrValues.length
      : 0,
  };
}

function buildBreakdownRowsFromTrades(
  trades: Trade[],
  selector: (trade: Trade) => string | null | undefined,
): NormalizedBreakdownRow[] {
  const grouped = new Map<string, { trades: number; wins: number; profit: number }>();

  for (const trade of trades) {
    const label = selector(trade)?.trim() || "Unknown";
    const current = grouped.get(label) ?? { trades: 0, wins: 0, profit: 0 };

    current.trades += 1;
    current.wins += trade.result === "Win" ? 1 : 0;
    current.profit += trade.profit;

    grouped.set(label, current);
  }

  return Array.from(grouped.entries()).map(([label, value]) => ({
    key: label,
    label,
    trades: value.trades,
    wins: value.wins,
    winRate: value.trades > 0 ? (value.wins / value.trades) * 100 : 0,
    profit: value.profit,
    averageProfit: value.trades > 0 ? value.profit / value.trades : 0,
  }));
}

function filterTradesForBreakdown(kind: BreakdownKind, label: string, trades: Trade[]) {
  if (kind === "pair") {
    return trades.filter((trade) => trade.pair === label);
  }

  if (kind === "session") {
    return trades.filter((trade) => (trade.session ?? "Unknown") === label);
  }

  if (kind === "emotion") {
    return trades.filter((trade) => (trade.emotion ?? "Unknown") === label);
  }

  return trades.filter((trade) => (trade.setup ?? "Unknown") === label);
}

async function listAllTradesForAnalytics(accountId?: string) {
  const allTrades: Trade[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await listTrades({
      accountId,
      page,
      pageSize: ANALYTICS_TRADE_PAGE_SIZE,
      sortBy: "date",
      sortOrder: "asc",
    });

    allTrades.push(...response.items);
    totalPages = response.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return allTrades;
}

function TrendTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0]?.payload as TrendPoint | undefined;

  if (!datum) {
    return null;
  }

  return (
    <div className="min-w-[180px] rounded-2xl border border-border/70 bg-popover/96 px-4 py-3 text-xs text-popover-foreground shadow-[0_20px_50px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:shadow-[0_20px_50px_-24px_rgba(1,8,24,0.88)]">
      <p className="font-medium text-foreground">{datum.fullDate}</p>
      <div className="mt-3 grid gap-1.5">
        <p>Cumulative PnL: {formatCurrencyDisplay(datum.cumulativeProfit)}</p>
        <p>Day PnL: {formatCurrencyDisplay(datum.dailyProfit)}</p>
        <p>Trades: {formatNumberDisplay(datum.trades)}</p>
      </div>
    </div>
  );
}

function OverviewMetric({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl bg-background/70 px-4 py-3 dark:bg-white/[0.03]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-muted-foreground">{subtext}</p> : null}
    </div>
  );
}

function BreakdownInsightMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/55 px-4 py-3 dark:bg-white/[0.03]">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-1.5 text-sm font-semibold text-foreground",
        tone === "success" && "text-success",
        tone === "danger" && "text-danger",
      )}>
        {value}
      </p>
    </div>
  );
}

function AnalyticsEmptyDashboard({ onAddTrade }: { onAddTrade: () => void }) {
  return (
    <SectionCard className="overflow-hidden border-border/60 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_32%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))] p-0">
      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(300px,0.58fr)] lg:p-8">
        <div className="space-y-5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-primary shadow-sm dark:bg-white/[0.04]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">No trades yet</h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {ANALYTICS_EMPTY_MESSAGE}
            </p>
          </div>
          <Button className="rounded-2xl" onClick={onAddTrade}>
            <Plus className="mr-2 h-4 w-4" />
            Add Trade
          </Button>
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net PnL</p>
                <div className="mt-2 h-8 w-32 rounded-full bg-border/60" />
              </div>
              <div className="h-8 w-20 rounded-full bg-border/45" />
            </div>
            <div className="h-40 rounded-3xl bg-[linear-gradient(180deg,hsl(var(--primary)/0.12),transparent_65%)]">
              <div className="flex h-full items-end gap-3 px-4 pb-4">
                {["h-8", "h-12", "h-10", "h-20", "h-16", "h-28"].map((height) => (
                  <div key={height} className={cn("w-full rounded-t-2xl bg-primary/12", height)} />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Quick Insights</p>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3 rounded-2xl bg-muted/50 px-3 py-3 dark:bg-white/[0.03]">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary/50" />
                  <div className="h-4 w-full rounded-full bg-border/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function BreakdownPanel({
  kind,
  title,
  description,
  rows,
  loading,
  onInspect,
}: {
  kind: BreakdownKind;
  title: string;
  description?: string;
  rows: PerformanceRow[];
  loading: boolean;
  onInspect: (row: PerformanceRow) => void;
}) {
  const bestRow = pickBestRow(rows);
  const worstRow = pickWorstRow(rows);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const totalTrades = rows.reduce((sum, row) => sum + row.trades, 0);
  const weightedWinRate = totalTrades > 0
    ? rows.reduce((sum, row) => sum + ((row.winRate / 100) * row.trades), 0) / totalTrades * 100
    : 0;

  return (
    <SectionCard className="space-y-6 border-border/60 p-0">
      <div className="border-b border-border/50 px-5 py-5 sm:px-6">
        <SectionHeader title={title} description={description} />
      </div>

      <div className="grid gap-3 px-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <BreakdownInsightMetric
          label="Best Performer"
          value={bestRow ? `${bestRow.label} · ${formatCompactCurrencyDisplay(bestRow.profit)}` : "No data"}
          tone="success"
        />
        <BreakdownInsightMetric
          label="Worst Performer"
          value={worstRow ? `${worstRow.label} · ${formatCompactCurrencyDisplay(worstRow.profit)}` : "No data"}
          tone="danger"
        />
        <BreakdownInsightMetric
          label="Total PnL"
          value={formatCurrencyDisplay(totalProfit)}
          tone={totalProfit > 0 ? "success" : totalProfit < 0 ? "danger" : "default"}
        />
        <BreakdownInsightMetric
          label="Win Rate"
          value={formatPercentageDisplay(weightedWinRate)}
        />
      </div>

      <div className="px-5 sm:px-6">
        {loading ? (
          <div className="h-[280px] animate-pulse rounded-3xl bg-muted/50" />
        ) : (
          <>
            {kind === "setup" ? <SetupsBreakdownChart rows={rows} onInspect={onInspect} /> : null}
            {kind === "pair" ? <PairsBreakdownChart rows={rows} onInspect={onInspect} /> : null}
            {kind === "session" ? <SessionsBreakdownChart rows={rows} onInspect={onInspect} /> : null}
            {kind === "emotion" ? <EmotionsBreakdownChart rows={rows} onInspect={onInspect} /> : null}
          </>
        )}
      </div>

      <div className="border-t border-border/50 px-5 py-5 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="text-right">Win Rate</TableHead>
              <TableHead className="text-right">Net PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isBest = bestRow?.key === row.key;
              const isWorst = worstRow?.key === row.key;

              return (
                <TableRow
                  key={row.key}
                  className={cn(
                    "cursor-pointer border-border/50",
                    isBest && "bg-success/8 hover:bg-success/12",
                    isWorst && "bg-danger/8 hover:bg-danger/12",
                  )}
                  onClick={() => onInspect(row)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: getBreakdownCategoryAccent({
                            kind,
                            label: row.label,
                            profit: row.profit,
                            rows,
                          }),
                        }}
                      />
                      <div>
                        <p className="font-medium text-foreground">{row.label}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular text-foreground">{formatNumberDisplay(row.trades)}</TableCell>
                  <TableCell className="text-right tabular text-foreground">{formatPercentageDisplay(row.winRate)}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular", getProfitTone(row.profit))}>
                    {formatCurrencyDisplay(row.profit)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const [currentMonth, setCurrentMonth] = useState(() => normalizeMonthKey(null));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<BreakdownTab>("setups");
  const [breakdownDrawer, setBreakdownDrawer] = useState<BreakdownDrawerState | null>(null);

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts", "active"),
    queryFn: async () => {
      const response = await listAccounts({ status: "active" });
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
    queryKey: privateQueryKey(user.id, "analytics-detailed-trades", accountId ?? "all"),
    queryFn: async () => withMinimumDelay(() => listAllTradesForAnalytics(accountId)),
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

  const dayTrades = dayTradesQuery.data ?? EMPTY_TRADES;
  const allDetailedTrades = detailedTradesQuery.data ?? EMPTY_TRADES;

  useUnauthorizedSessionGuard(
    accountsQuery.error,
    breakdownsQuery.error,
    calendarQuery.error,
    detailedTradesQuery.error,
    dayTradesQuery.error,
  );

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
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Analytics request invalid",
      validationDescription: "The analytics filters or month selection are invalid.",
      timeoutTitle: "Analytics request timed out",
      timeoutDescription: "Loading analytics took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={pageError.title}
        description={pageError.description}
        layout="page"
        size="wide"
        onRetry={pageError.allowRetry ? () => {
          void Promise.all([breakdownsQuery.refetch(), calendarQuery.refetch(), detailedTradesQuery.refetch()]);
        } : undefined}
        isRetrying={breakdownsQuery.isFetching || calendarQuery.isFetching || detailedTradesQuery.isFetching}
      />
    );
  }

  const breakdowns = breakdownsQuery.data ?? normalizeAnalyticsBreakdownsResponse(null);
  const fallbackSummary = buildAnalyticsSummaryFromTrades(allDetailedTrades);
  const effectiveSummary = breakdowns.summary.totalTrades > 0 || allDetailedTrades.length === 0
    ? breakdowns.summary
    : fallbackSummary;
  const setupRows = createPerformanceDataset(sortRowsByProfit(
    breakdowns.setupPerformance.length > 0
      ? breakdowns.setupPerformance
      : buildBreakdownRowsFromTrades(allDetailedTrades, (trade) => trade.setup),
  ));
  const pairRows = createPerformanceDataset(sortRowsByProfit(
    breakdowns.pairPerformance.length > 0
      ? breakdowns.pairPerformance
      : buildBreakdownRowsFromTrades(allDetailedTrades, (trade) => trade.pair),
  ));
  const emotionRows = createPerformanceDataset(sortRowsByProfit(
    breakdowns.emotionPerformance.length > 0
      ? breakdowns.emotionPerformance
      : buildBreakdownRowsFromTrades(allDetailedTrades, (trade) => trade.emotion),
  ));
  const sessionRows = createPerformanceDataset(sortRowsByProfit(
    breakdowns.sessionPerformance.length > 0
      ? breakdowns.sessionPerformance
      : buildBreakdownRowsFromTrades(allDetailedTrades, (trade) => trade.session),
  ));
  const tradeTrendPoints = buildTrendSeries(allDetailedTrades);
  const calendarTrendPoints = buildTrendSeriesFromCalendar(calendar.days);
  const trendPoints = tradeTrendPoints.length > 0 ? tradeTrendPoints : calendarTrendPoints;
  const tradeDailySummaries = buildDailySummaries(allDetailedTrades);
  const calendarDailySummaries = buildDailySummariesFromCalendar(calendar.days);
  const dailySummaries = tradeDailySummaries.length > 0 ? tradeDailySummaries : calendarDailySummaries;
  const bestSetup = pickBestRow(setupRows);
  const worstSession = pickWorstRow(sessionRows);
  const mostTradedPair = pickMostTradedRow(pairRows);
  const averageRR = allDetailedTrades.length > 0
    ? allDetailedTrades.reduce((sum, trade) => sum + calculatePlannedRR(trade), 0) / allDetailedTrades.length
    : effectiveSummary.avgRR;
  const performanceScore = buildPerformanceScore({
    winRate: effectiveSummary.winRate,
    avgRR: averageRR,
    dailySummaries,
    trend: trendPoints,
    totalGross: effectiveSummary.totalGross,
  });
  const quickInsights = [
    bestSetup
      ? `Best setup: ${bestSetup.label} ${formatCurrencyDisplay(bestSetup.profit)}`
      : "Best setup: No data",
    worstSession
      ? `Weakest session: ${worstSession.label} ${formatCurrencyDisplay(worstSession.profit)}`
      : "Weakest session: No data",
    mostTradedPair
      ? `Most traded pair: ${mostTradedPair.label} · ${formatNumberDisplay(mostTradedPair.trades)}`
      : "Most traded pair: No data",
    buildBehaviorInsight(dailySummaries),
  ];

  const breakdownDefinitions: BreakdownDefinition[] = [
    {
      key: "setups",
      label: "Setups",
      description: undefined,
      rows: setupRows,
      kind: "setup",
    },
    {
      key: "pairs",
      label: "Pairs",
      description: undefined,
      rows: pairRows,
      kind: "pair",
    },
    {
      key: "sessions",
      label: "Sessions",
      description: undefined,
      rows: sessionRows,
      kind: "session",
    },
    {
      key: "emotions",
      label: "Emotions",
      description: undefined,
      rows: emotionRows,
      kind: "emotion",
    },
  ];

  const breakdownDrawerTrades = breakdownDrawer
    ? filterTradesForBreakdown(breakdownDrawer.kind, breakdownDrawer.label, allDetailedTrades)
    : EMPTY_TRADES;

  const drawerStats = buildBreakdownDrawerStats(breakdownDrawerTrades);
  const hasAnalyticsData = effectiveSummary.totalTrades > 0
    || calendar.summary.totalTrades > 0
    || allDetailedTrades.length > 0;
  const trendEmptyMessage = effectiveSummary.totalTrades > 0 || calendar.summary.totalTrades > 0
    ? "Trend data is still syncing."
    : ANALYTICS_EMPTY_MESSAGE;

  function openBreakdownSlice(definition: BreakdownDefinition, row: PerformanceRow) {
    setBreakdownDrawer({
      kind: definition.kind,
      title: row.label,
      description: `${formatNumberDisplay(row.trades)} trades`,
      label: row.label,
    });
  }

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
              triggerClassName="h-10 min-w-[220px] rounded-2xl"
            />
          )}
        />

        {!hasAnalyticsData ? (
          <AnalyticsEmptyDashboard onAddTrade={() => navigate("/trades")} />
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MainTab)} className="w-full">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="grid h-auto w-full grid-cols-3 sm:max-w-[360px]">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="breakdowns">Breakdown</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </TabsList>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{formatNumberDisplay(effectiveSummary.totalTrades)} trades tracked</span>
                <span className="hidden h-4 w-px bg-border/80 sm:block" />
                <span>{formatCurrencyDisplay(effectiveSummary.totalProfit)} net</span>
              </div>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.38fr)_minmax(320px,0.62fr)]">
                <SectionCard className="overflow-hidden border-border/60 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_34%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))] p-0">
                  <div className="border-b border-border/50 px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Net PnL</p>
                        <p className={cn("mt-3 font-mono-price text-4xl font-semibold sm:text-5xl", getProfitTone(effectiveSummary.totalProfit))}>
                          {formatCurrencyDisplay(effectiveSummary.totalProfit)}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.03]">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {effectiveSummary.totalProfit > 0 ? "Positive expectancy" : effectiveSummary.totalProfit < 0 ? "Needs recovery" : "Flat performance"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 border-b border-border/50 px-5 py-5 sm:grid-cols-3 sm:px-6">
                    <OverviewMetric label="Win Rate" value={formatPercentageDisplay(effectiveSummary.winRate)} />
                    <OverviewMetric label="Avg RR" value={`1:${formatNumberDisplay(averageRR, { minimumFractionDigits: 2 })}`} />
                    <OverviewMetric label="Trades" value={formatNumberDisplay(effectiveSummary.totalTrades)} />
                  </div>

                  <div className="px-2 pb-3 pt-4 sm:px-4">
                    {detailedTradesQuery.isLoading && trendPoints.length === 0 ? (
                      <div className="h-[320px] animate-pulse rounded-3xl bg-muted/45" />
                    ) : trendPoints.length === 0 ? (
                      <EmptyChartState message={trendEmptyMessage} />
                    ) : (
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendPoints} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
                            <defs>
                              <linearGradient id="analytics-pnl-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={ACCENT_LINE} stopOpacity={0.28} />
                                <stop offset="95%" stopColor={ACCENT_LINE} stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                            <XAxis
                              dataKey="shortDate"
                              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              minTickGap={28}
                            />
                            <YAxis
                              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) => formatCompactCurrencyDisplay(value)}
                            />
                            <ReferenceLine y={0} stroke={REFERENCE_LINE} />
                            <Tooltip content={<TrendTooltip />} cursor={{ fill: CURSOR_FILL }} />
                            <Area
                              type="monotone"
                              dataKey="cumulativeProfit"
                              stroke={ACCENT_LINE}
                              strokeWidth={3}
                              fill="url(#analytics-pnl-area)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <div className="space-y-6">
                  <SectionCard className="border-border/60">
                    <SectionHeader title="Performance Score" />

                    <div className="mt-5 space-y-5">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-4xl font-semibold text-foreground">{formatNumberDisplay(performanceScore.score)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">out of 100</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Max drawdown</p>
                          <p className="mt-1 font-medium text-foreground">{formatCurrencyDisplay(performanceScore.maxDrawdown, { showPlus: false })}</p>
                        </div>
                      </div>

                      <Progress value={performanceScore.score} className="h-2.5 bg-muted" />

                      <div className="grid gap-3">
                        {performanceScore.factors.map((factor) => (
                          <div key={factor.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{factor.label}</span>
                            <span className="font-medium text-foreground">{formatNumberDisplay(factor.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard className="border-border/60">
                    <SectionHeader title="Quick Insights" />

                    <ul className="mt-5 grid gap-3">
                      {quickInsights.map((insight) => (
                        <li key={insight} className="flex items-start gap-3 rounded-2xl bg-muted/45 px-4 py-3 text-sm leading-6 text-foreground dark:bg-white/[0.03]">
                          <span className="mt-2 h-2 w-2 rounded-full bg-primary/70" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breakdowns" className="space-y-6">
              <Tabs value={activeBreakdownTab} onValueChange={(value) => setActiveBreakdownTab(value as BreakdownTab)} className="space-y-6">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 sm:max-w-[520px] sm:grid-cols-4">
                  {breakdownDefinitions.map((definition) => (
                    <TabsTrigger key={definition.key} value={definition.key}>
                      {definition.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {breakdownDefinitions.map((definition) => (
                  <TabsContent key={definition.key} value={definition.key} className="space-y-6">
                    <BreakdownPanel
                      kind={definition.kind}
                      title={definition.label}
                      description={definition.description}
                      rows={definition.rows}
                      loading={detailedTradesQuery.isLoading}
                      onInspect={(row) => openBreakdownSlice(definition, row)}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <SectionCard className="border-border/50">
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
                  <OverviewMetric label="PnL" value={formatCurrencyDisplay(calendar.summary.totalProfit)} />
                  <OverviewMetric label="Trades" value={formatNumberDisplay(calendar.summary.totalTrades)} />
                  <OverviewMetric label="Win Rate" value={formatPercentageDisplay(calendar.summary.winRate)} />
                </div>
              </SectionCard>

              <SectionCard className="overflow-hidden border-border/50">
                <div className="mb-4 grid grid-cols-7 gap-2 pr-0 text-center text-[11px] font-medium text-muted-foreground lg:pr-[180px]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                {calendar.weeks.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No trades"
                    description="Try another month."
                  />
                ) : (
                  <div className="space-y-3">
                    {calendar.weeks.map((week, index) => (
                      <div key={week.key ?? index} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-start">
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

                        <div className="rounded-2xl border border-border/40 bg-background/60 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-medium text-muted-foreground">Week</p>
                            <p className="text-[11px] text-muted-foreground">{formatNumberDisplay(week.summary.tradeCount)} trades</p>
                          </div>
                          <p className={cn("mt-3 font-mono-price numeric-safe max-w-full text-lg font-semibold", getProfitTone(week.summary.totalProfit))}>
                            {formatCurrencyDisplay(week.summary.totalProfit)}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                            <span>Win</span>
                            <span>{formatPercentageDisplay(week.summary.winRate)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>
        )}
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
        trades={breakdownDrawerTrades}
        loading={detailedTradesQuery.isLoading || detailedTradesQuery.isFetching}
        onClose={() => setBreakdownDrawer(null)}
        onTradeClick={(tradeId) => navigate(`/trades/${tradeId}`)}
        onViewAllTrades={() => navigate("/trades")}
      />
    </>
  );
}
