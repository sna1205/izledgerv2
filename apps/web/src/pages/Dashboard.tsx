import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, CalendarDays, Target, Wallet } from "lucide-react";
import { AccountFilterSelect } from "@/features/accounts/components/AccountFilterSelect";
import { DataBadge } from "@/components/DataBadge";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard, SectionHeader } from "@/layouts/PageShell";
import { TodayImportantEventsWidget } from "@/features/economic-calendar/components/TodayImportantEventsWidget";
import { ProfitDisplay } from "@/features/trades/components/ProfitDisplay";
import { ResultBadge } from "@/features/trades/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { StatCard } from "@/components/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { listAccounts } from "@/services/api/accounts";
import { getDashboardSummary } from "@/services/api/analytics";
import { resolveAccountFilter, useAccountFilter } from "@/utils/account-filter";
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  formatDateDisplay,
  formatPercentageDisplay,
  normalizeDashboardSummaryResponse,
} from "@/utils/analytics-rendering";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import { privateQueryKey } from "@/services/query-client";
import { cn } from "@/utils/class-names";

const equityChartConfig = {
  equity: {
    label: "Equity",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function getZeroGradientOffset(minValue: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  if (minValue >= 0) return 1;

  return maxValue / (maxValue - minValue);
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accountFilter, setAccountFilter] = useAccountFilter();

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
    if (resolvedAccountFilter !== accountFilter) {
      setAccountFilter(resolvedAccountFilter);
    }
  }, [accountFilter, resolvedAccountFilter, setAccountFilter]);

  const summaryQuery = useQuery({
    queryKey: privateQueryKey(user.id, "dashboard-summary", resolvedAccountFilter),
    queryFn: async () => normalizeDashboardSummaryResponse(
      await withMinimumDelay(() => getDashboardSummary(
        resolvedAccountFilter === "all" ? undefined : resolvedAccountFilter,
      )),
    ),
  });

  useUnauthorizedSessionGuard(accountsQuery.error, summaryQuery.error);

  const equityCurve = useMemo(() => summaryQuery.data?.equityCurve ?? [], [summaryQuery.data?.equityCurve]);
  const equityRange = useMemo(() => {
    if (equityCurve.length === 0) {
      return {
        min: 0,
        max: 0,
        zeroOffset: 1,
      };
    }

    const values = equityCurve.map((point) => point.equity);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);

    return {
      min,
      max,
      zeroOffset: getZeroGradientOffset(min, max),
    };
  }, [equityCurve]);

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <DashboardSkeleton />;
  }

  if (summaryQuery.isError) {
    const errorState = getPageErrorState(summaryQuery.error, {
      unavailableTitle: "Dashboard unavailable",
      unavailableDescription: "The dashboard service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Dashboard request invalid",
      validationDescription: "The dashboard request could not be processed.",
      timeoutTitle: "Dashboard request timed out",
      timeoutDescription: "Loading the dashboard took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        onRetry={errorState.allowRetry ? () => void summaryQuery.refetch() : undefined}
        isRetrying={summaryQuery.isFetching}
      />
    );
  }

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const dashboard = summaryQuery.data ?? normalizeDashboardSummaryResponse(null);
  const summary = dashboard.summary;
  const recentTrades = dashboard.recentTrades;
  const currentEquity = equityCurve[equityCurve.length - 1]?.equity ?? 0;
  const instrumentUniverse = Array.from(new Set(recentTrades.map((trade) => trade.pair))).slice(0, 6);

  return (
    <PageShell size="wide">
      <PageHeader
        title="Dashboard"
        actions={(
          <AccountFilterSelect
            accounts={accounts ?? []}
            value={resolvedAccountFilter}
            onValueChange={setAccountFilter}
            triggerClassName="h-10 min-w-[220px] rounded-2xl"
          />
        )}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today"
          value={String(summary.todayTrades)}
          subtext={todayLabel}
          icon={CalendarDays}
        />
        <StatCard
          label="Total PnL"
          value={formatCurrencyDisplay(summary.totalProfit)}
          tone={summary.totalProfit > 0 ? "positive" : summary.totalProfit < 0 ? "negative" : "default"}
          icon={Wallet}
        />
        <StatCard
          label="Win Rate"
          value={formatPercentageDisplay(summary.winRate)}
          icon={Target}
        />
        <StatCard
          label="Trades"
          value={String(summary.totalTrades)}
          icon={Activity}
        />
      </div>

      <SectionCard>
        <SectionHeader
          title="Equity"
          action={equityCurve.length > 0 ? (
            <div className="surface-muted px-4 py-3 text-right">
              <p className="text-label mb-2">Equity</p>
              <p className={cn("font-mono-price numeric-safe max-w-full text-2xl font-semibold", currentEquity > 0 ? "text-success" : currentEquity < 0 ? "text-danger" : "text-foreground")}>
                {formatCurrencyDisplay(currentEquity)}
              </p>
            </div>
          ) : null}
        />

        {equityCurve.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Activity}
              title="No trades yet"
              description="Add a trade to see equity."
              action={(
                <Link
                  to="/trades"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
                >
                  Add trade
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              className="py-16"
            />
          </div>
        ) : (
          <div className="mt-6">
            <ChartContainer config={equityChartConfig} className="h-[320px] w-full">
              <AreaChart accessibilityLayer data={equityCurve} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="dashboard-equity-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.24} />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--success))" stopOpacity={0.12} />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--danger))" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(var(--danger))" stopOpacity={0.22} />
                  </linearGradient>
                  <linearGradient id="dashboard-equity-stroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--success))" />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--danger))" />
                    <stop offset="100%" stopColor="hsl(var(--danger))" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  axisLine={false}
                  dataKey="shortDate"
                  fontSize={12}
                  minTickGap={28}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  fontSize={12}
                  width={56}
                  domain={[equityRange.min, equityRange.max]}
                  tickFormatter={(value) => formatCompactCurrencyDisplay(value)}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ChartTooltip
                  cursor={false}
                  content={(
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate}
                      formatter={(value, _, item) => (
                        <div className="flex min-w-[11rem] items-center justify-between gap-4">
                          <div className="grid gap-1">
                            <span className="text-muted-foreground">Equity</span>
                            <span className="text-xs text-muted-foreground">{item.payload.pair}</span>
                          </div>
                          <span className="font-mono-price font-medium text-foreground">
                            {formatCurrencyDisplay(value)}
                          </span>
                        </div>
                      )}
                    />
                  )}
                />
                <Area
                  dataKey="equity"
                  fill="url(#dashboard-equity-fill)"
                  fillOpacity={1}
                  isAnimationActive={false}
                  stroke="url(#dashboard-equity-stroke)"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Recent Trades"
          action={(
            <Link to="/trades" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Open trades
            </Link>
          )}
        />

        {recentTrades.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Activity}
              title="No recent trades yet"
              description="Log a trade to populate this table."
              action={(
                <Link
                  to="/trades"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-background/85 px-4 py-2 text-sm font-medium text-foreground"
                >
                  Open Trades
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Pair / Direction</TableHead>
                  <TableHead>Setup</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrades.map((trade) => (
                  <TableRow
                    key={trade.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/trades/${trade.id}`)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateDisplay(trade.date, { fallback: "--" })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{trade.pair}</p>
                        <DataBadge tone={trade.direction === "Buy" ? "success" : "danger"}>
                          {trade.direction ?? "Unknown"}
                        </DataBadge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : <span className="text-sm text-muted-foreground">No setup</span>}
                    </TableCell>
                    <TableCell>
                      {trade.result ? <ResultBadge result={trade.result} /> : <span className="text-sm text-muted-foreground">Pending</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProfitDisplay value={trade.profit} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <TodayImportantEventsWidget instrumentUniverse={instrumentUniverse} />
      </SectionCard>
    </PageShell>
  );
}
