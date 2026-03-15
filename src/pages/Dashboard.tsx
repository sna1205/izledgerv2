import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { AccountFilterSelect } from "@/components/AccountFilterSelect";
import { filterTradesByAccount, useAccountFilter } from "@/lib/account-filter";
import { getTrades } from "@/lib/trades";
import { computeStats, getTodayTrades } from "@/lib/analytics";
import { StatCard } from "@/components/StatCard";
import { ResultBadge } from "@/components/ResultBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { SetupTag } from "@/components/SetupTag";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { motion } from "framer-motion";

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: i * 0.05 },
  }),
};

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
  const trades = useMemo(() => getTrades(), []);
  const filteredTrades = useMemo(
    () => filterTradesByAccount(trades, accountFilter),
    [accountFilter, trades],
  );
  const todayTrades = useMemo(() => getTodayTrades(filteredTrades), [filteredTrades]);
  const stats = useMemo(() => computeStats(filteredTrades), [filteredTrades]);
  const recentTrades = filteredTrades.slice(0, 8);
  const equityCurve = useMemo(() => {
    const chronologicalTrades = [...filteredTrades].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }

      return (a.createdAt || a.date).localeCompare(b.createdAt || b.date);
    });

    let equity = 0;

    return chronologicalTrades.map((trade, index) => {
      equity += trade.profit;

      return {
        tradeNumber: index + 1,
        equity: Number(equity.toFixed(2)),
        pair: trade.pair,
        profit: trade.profit,
        shortDate: formatTradeDate(trade.date, shortDateFormatter),
        fullDate: formatTradeDate(trade.date, longDateFormatter),
      };
    });
  }, [filteredTrades]);
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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1440px]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Session Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>

        <div className="w-full lg:w-auto">
          <AccountFilterSelect value={accountFilter} onValueChange={setAccountFilter} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Trades" value={String(todayTrades.length)} />
        <StatCard label="Total Trades" value={String(stats.total)} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
        <StatCard
          label="Total PnL"
          value={`${stats.totalProfit >= 0 ? '+' : '-'}$${Math.abs(stats.totalProfit).toFixed(2)}`}
        />
      </div>

      <div className="mb-8 rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-foreground">Equity Curve</h2>
            <p className="text-xs text-muted-foreground">Cumulative PnL after each logged trade.</p>
          </div>
          {equityCurve.length > 0 && (
            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Current Equity</p>
              <p className="font-mono-price text-lg font-semibold text-foreground">
                {formatCurrency(equityCurve[equityCurve.length - 1].equity)}
              </p>
            </div>
          )}
        </div>

        {equityCurve.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">Log trades for this account to see your equity curve.</p>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">Recent Trades</h2>
          <Link to="/trades" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-sm text-muted-foreground">No trades found for this account yet.</p>
            <Link to="/trades" className="text-sm text-foreground underline mt-2 inline-block">
              Log your first trade →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {recentTrades.map((trade, i) => (
                <motion.div
                  key={trade.id}
                  custom={i}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{trade.pair}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{trade.date}</p>
                    </div>
                    <ProfitDisplay value={trade.profit} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <ResultBadge result={trade.result} />
                    <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                      {trade.direction}
                    </span>
                    {trade.setup ? <SetupTag label={trade.setup} /> : null}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Date</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Pair</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Direction</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Setup</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Result</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade, i) => (
                  <motion.tr
                    key={trade.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="py-2 px-4 text-sm tabular">{trade.date}</td>
                    <td className="py-2 px-4 text-sm font-medium">{trade.pair}</td>
                    <td className="py-2 px-4 text-sm text-muted-foreground">{trade.direction}</td>
                    <td className="py-2 px-4">{trade.setup && <SetupTag label={trade.setup} />}</td>
                    <td className="py-2 px-4"><ResultBadge result={trade.result} /></td>
                    <td className="py-2 px-4 text-right"><ProfitDisplay value={trade.profit} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
