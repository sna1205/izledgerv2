import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { AccountFilterSelect } from "@/components/AccountFilterSelect";
import { StatCard } from "@/components/StatCard";
import { ResultBadge } from "@/components/ResultBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { SetupTag } from "@/components/SetupTag";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { listAccounts } from "@/lib/api/accounts";
import { getDashboardSummary } from "@/lib/api/analytics";
import { resolveAccountFilter, useAccountFilter } from "@/lib/account-filter";

const equityChartConfig = {
  equity: {
    label: "Equity",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function formatAxisCurrency(value: number) {
  const absValue = Math.abs(value);

  if (absValue >= 1000) {
    return `${value < 0 ? "-" : ""}$${(absValue / 1000).toFixed(1)}k`;
  }

  return `${value < 0 ? "-" : ""}$${absValue.toFixed(0)}`;
}

function formatTradeDate(date: string, formatter: Intl.DateTimeFormat) {
  const [year, month, day] = date.split("-").map(Number);
  return formatter.format(new Date(year, month - 1, day));
}

function getZeroGradientOffset(minValue: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  if (minValue >= 0) return 1;

  return maxValue / (maxValue - minValue);
}

export default function Dashboard() {
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await listAccounts();
      return response.items;
    },
  });

  const accounts = accountsQuery.data ?? [];
  const resolvedAccountFilter = useMemo(
    () => resolveAccountFilter(accountFilter, accounts),
    [accountFilter, accounts],
  );

  useEffect(() => {
    if (resolvedAccountFilter !== accountFilter) {
      setAccountFilter(resolvedAccountFilter);
    }
  }, [accountFilter, resolvedAccountFilter, setAccountFilter]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", resolvedAccountFilter],
    queryFn: () => getDashboardSummary(resolvedAccountFilter === "all" ? undefined : resolvedAccountFilter),
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const equityCurve = useMemo(() => {
    return (summaryQuery.data?.equityCurve ?? []).map((point) => ({
      ...point,
      shortDate: formatTradeDate(point.date, shortDateFormatter),
      fullDate: formatTradeDate(point.date, longDateFormatter),
    }));
  }, [summaryQuery.data?.equityCurve]);

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
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (summaryQuery.isError) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">We could not load your dashboard data right now.</p>
        </div>
      </div>
    );
  }

  const summary = summaryQuery.data?.summary ?? {
    todayTrades: 0,
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
  };
  const recentTrades = summaryQuery.data?.recentTrades ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Session Summary</h1>
            <p className="mt-1 text-sm text-muted-foreground">{today}</p>
          </div>

          <div className="w-full lg:w-auto">
            <AccountFilterSelect accounts={accounts} value={resolvedAccountFilter} onValueChange={setAccountFilter} />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Today's Trades" value={String(summary.todayTrades)} />
          <StatCard label="Total Trades" value={String(summary.totalTrades)} />
          <StatCard label="Win Rate" value={`${summary.winRate.toFixed(1)}%`} />
          <StatCard
            label="Total PnL"
            value={`${summary.totalProfit >= 0 ? "+" : "-"}$${Math.abs(summary.totalProfit).toFixed(2)}`}
          />
        </div>

        <div className="mb-8 rounded-lg border bg-card p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">Equity Curve</h2>
              <p className="text-xs text-muted-foreground">Cumulative PnL after each logged trade.</p>
            </div>
            {equityCurve.length > 0 ? (
              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Current Equity</p>
                <p className="font-mono-price text-lg font-semibold text-foreground">
                  {formatCurrency(equityCurve[equityCurve.length - 1].equity)}
                </p>
              </div>
            ) : null}
          </div>

          {equityCurve.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">Log trades to see your equity curve.</p>
            </div>
          ) : (
            <ChartContainer config={equityChartConfig} className="h-[240px] w-full sm:h-[280px]">
              <AreaChart accessibilityLayer data={equityCurve} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.28} />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--success))" stopOpacity={0.1} />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--danger))" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(var(--danger))" stopOpacity={0.28} />
                  </linearGradient>
                  <linearGradient id="equity-stroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--success))" />
                    <stop offset={`${equityRange.zeroOffset * 100}%`} stopColor="hsl(var(--danger))" />
                    <stop offset="100%" stopColor="hsl(var(--danger))" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
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
                  tickFormatter={formatAxisCurrency}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate}
                      formatter={(value, _, item) => (
                        <div className="flex min-w-[10rem] items-center justify-between gap-4">
                          <div className="grid gap-1">
                            <span className="text-muted-foreground">Equity</span>
                            <span className="text-[11px] text-muted-foreground">{item.payload.pair}</span>
                          </div>
                          <span className="font-mono-price font-medium text-foreground">
                            {formatCurrency(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  dataKey="equity"
                  fill="url(#equity-fill)"
                  fillOpacity={1}
                  isAnimationActive={false}
                  stroke="url(#equity-stroke)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent Trades</h2>
            <Link to="/trades" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              View all →
            </Link>
          </div>

          {recentTrades.length === 0 ? (
            <div className="rounded-lg border p-12 text-center">
              <p className="text-sm text-muted-foreground">No trades found yet.</p>
              <Link to="/trades" className="mt-2 inline-block text-sm text-foreground underline">
                Log your first trade →
              </Link>
            </div>
          ) : (
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pair</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Direction</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Setup</th>
                    <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Result</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 text-sm">{trade.date}</td>
                      <td className="px-4 py-3 text-sm font-medium">{trade.pair}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{trade.direction}</td>
                      <td className="px-4 py-3">{trade.setup ? <SetupTag label={trade.setup} /> : null}</td>
                      <td className="px-4 py-3"><ResultBadge result={trade.result} /></td>
                      <td className="px-4 py-3 text-right"><ProfitDisplay value={trade.profit} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
