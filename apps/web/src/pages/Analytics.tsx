import { useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Label, LabelList, Pie, PieChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { AccountFilterSelect } from "@/components/AccountFilterSelect";
import { filterTradesByAccount, useAccountFilter } from "@/lib/account-filter";
import { getTrades } from "@/lib/trades";
import { computeStats } from "@/lib/analytics";
import { EMOTIONS, SESSIONS, type Trade } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { ResultBadge } from "@/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const WIN_COLOR = "#10b981";
const LOSS_COLOR = "#f43f5e";
const NEUTRAL_COLOR = "#94a3b8";
const fintechCardClass = "rounded-xl border border-border/60 bg-card p-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.14)] dark:shadow-[0_22px_48px_-28px_rgba(0,0,0,0.55)]";
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const analyticsChartConfig = {
  wins: {
    label: "Wins",
    color: WIN_COLOR,
  },
  losses: {
    label: "Losses",
    color: LOSS_COLOR,
  },
  pnl: {
    label: "Total PnL",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function formatCurrency(value: number) {
  if (value > 0) return `+${currencyFormatter.format(value)}`;
  if (value < 0) return `-${currencyFormatter.format(Math.abs(value))}`;
  return currencyFormatter.format(0);
}

function formatAxisCurrency(value: number) {
  const absValue = Math.abs(value);

  if (absValue >= 1000) {
    return `${value < 0 ? "-" : ""}$${(absValue / 1000).toFixed(1)}k`;
  }

  return `${value < 0 ? "-" : ""}$${absValue.toFixed(0)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getCalendarTone(totalProfit: number, tradeCount: number) {
  if (tradeCount === 0) {
    return "border-border/70 bg-card/70 text-muted-foreground shadow-none hover:border-border hover:bg-card/90 dark:bg-card/60";
  }

  if (totalProfit > 0) {
    return "border-emerald-300 bg-emerald-50 text-foreground dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-foreground";
  }

  if (totalProfit < 0) {
    return "border-rose-300 bg-rose-50 text-foreground dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-foreground";
  }

  return "border-border/70 bg-card/80 text-foreground hover:border-border hover:bg-card/95 dark:bg-card/70";
}

function getPnLTextTone(totalProfit: number, tradeCount: number) {
  if (tradeCount === 0) {
    return "text-slate-500 dark:text-slate-400";
  }

  if (totalProfit > 0) {
    return "text-emerald-600 dark:text-emerald-300";
  }

  if (totalProfit < 0) {
    return "text-rose-600 dark:text-rose-300";
  }

  return "text-foreground";
}

function getPerformanceColor(value: number) {
  if (value > 0) return WIN_COLOR;
  if (value < 0) return LOSS_COLOR;
  return NEUTRAL_COLOR;
}

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export default function Analytics() {
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const trades = useMemo(() => getTrades(), []);
  const filteredTrades = useMemo(() => filterTradesByAccount(trades, accountFilter), [accountFilter, trades]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const stats = useMemo(() => computeStats(filteredTrades), [filteredTrades]);

  useEffect(() => {
    setSelectedDateKey(null);
  }, [accountFilter]);

  const winLossData = useMemo(() => {
    if (stats.total === 0) {
      return [];
    }

    return [
      {
        key: "wins",
        name: "Wins",
        value: stats.wins,
        percentage: (stats.wins / stats.total) * 100,
        fill: "var(--color-wins)",
      },
      {
        key: "losses",
        name: "Losses",
        value: stats.losses,
        percentage: (stats.losses / stats.total) * 100,
        fill: "var(--color-losses)",
      },
    ].filter((entry) => entry.value > 0);
  }, [stats]);

  const sessionPerformance = useMemo(
    () =>
      SESSIONS.map((session) => {
        const sessionTrades = filteredTrades.filter((trade) => trade.session === session);
        const profit = sessionTrades.reduce((sum, trade) => sum + trade.profit, 0);

        return {
          session,
          trades: sessionTrades.length,
          profit: Number(profit.toFixed(2)),
          fill: getPerformanceColor(profit),
        };
      }),
    [filteredTrades],
  );

  const hasSessionData = useMemo(() => filteredTrades.some((trade) => trade.session), [filteredTrades]);

  const sessionDomain = useMemo(() => {
    const values = sessionPerformance.map((item) => item.profit);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const padding = Math.max((max - min) * 0.18, 60);

    return [min - padding, max + padding] as [number, number];
  }, [sessionPerformance]);

  const emotionPerformance = useMemo(
    () =>
      EMOTIONS.map((emotion) => {
        const emotionTrades = filteredTrades.filter((trade) => trade.emotion === emotion);
        const profit = emotionTrades.reduce((sum, trade) => sum + trade.profit, 0);

        return {
          emotion,
          trades: emotionTrades.length,
          profit: Number(profit.toFixed(2)),
          avgProfit: emotionTrades.length > 0 ? profit / emotionTrades.length : 0,
          fill: getPerformanceColor(profit),
        };
      }).sort((a, b) => b.profit - a.profit || b.trades - a.trades),
    [filteredTrades],
  );

  const hasEmotionData = useMemo(() => filteredTrades.some((trade) => trade.emotion), [filteredTrades]);
  const maxEmotionProfit = useMemo(
    () => Math.max(...emotionPerformance.map((item) => Math.abs(item.profit)), 1),
    [emotionPerformance],
  );

  const dailyTradeMap = useMemo(() => {
    return filteredTrades.reduce<Record<string, { trades: Trade[]; totalProfit: number; tradeCount: number; wins: number; grossProfit: number; grossLoss: number }>>((acc, trade) => {
      const existing = acc[trade.date] || { trades: [], totalProfit: 0, tradeCount: 0, wins: 0, grossProfit: 0, grossLoss: 0 };

      existing.trades.push(trade);
      existing.totalProfit += trade.profit;
      existing.tradeCount += 1;
      if (trade.result === "Win") existing.wins += 1;
      if (trade.profit > 0) existing.grossProfit += trade.profit;
      if (trade.profit < 0) existing.grossLoss += trade.profit;
      acc[trade.date] = existing;

      return acc;
    }, {});
  }, [filteredTrades]);

  const currentMonthKey = useMemo(() => format(currentMonth, "yyyy-MM"), [currentMonth]);
  const currentMonthTrades = useMemo(
    () => filteredTrades.filter((trade) => trade.date.startsWith(currentMonthKey)),
    [currentMonthKey, filteredTrades],
  );
  const monthlySummary = useMemo(() => {
    const totalProfit = currentMonthTrades.reduce((sum, trade) => sum + trade.profit, 0);
    const totalTrades = currentMonthTrades.length;
    const wins = currentMonthTrades.filter((trade) => trade.result === "Win").length;

    return {
      totalProfit,
      totalTrades,
      winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    };
  }, [currentMonthTrades]);

  const calendarDays = useMemo(() => {
    const intervalStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const intervalEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });

    return eachDayOfInterval({ start: intervalStart, end: intervalEnd }).map((day) => {
      const dateKey = toDateKey(day);
      const summary = dailyTradeMap[dateKey] || { trades: [], totalProfit: 0, tradeCount: 0, wins: 0, grossProfit: 0, grossLoss: 0 };

      return {
        date: day,
        dateKey,
        inCurrentMonth: isSameMonth(day, currentMonth),
        winRate: summary.tradeCount > 0 ? (summary.wins / summary.tradeCount) * 100 : 0,
        ...summary,
      };
    });
  }, [currentMonth, dailyTradeMap]);

  const calendarWeeks = useMemo(() => {
    const weeks = [];

    for (let index = 0; index < calendarDays.length; index += 7) {
      const days = calendarDays.slice(index, index + 7);
      const activeDays = days.filter((day) => day.inCurrentMonth);
      const tradeCount = activeDays.reduce((sum, day) => sum + day.tradeCount, 0);
      const totalProfit = activeDays.reduce((sum, day) => sum + day.totalProfit, 0);
      const wins = activeDays.reduce((sum, day) => sum + day.wins, 0);

      weeks.push({
        days,
        summary: {
          tradeCount,
          totalProfit,
          winRate: tradeCount > 0 ? (wins / tradeCount) * 100 : 0,
        },
      });
    }

    return weeks;
  }, [calendarDays]);

  const selectedDay = selectedDateKey
    ? dailyTradeMap[selectedDateKey] || { trades: [], totalProfit: 0, tradeCount: 0, wins: 0, grossProfit: 0, grossLoss: 0 }
    : null;

  const renderSessionTick = ({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) => {
    const item = sessionPerformance.find((entry) => entry.session === payload?.value);

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={12} fontWeight={500}>
          {payload?.value}
        </text>
        <text x={0} y={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
          {item?.trades ?? 0} trades
        </text>
      </g>
    );
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-6">
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 z-20 mb-6 bg-background/95 pb-4 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border bg-muted/40 p-1 sm:w-[320px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            <div className="w-full lg:w-auto">
              <AccountFilterSelect value={accountFilter} onValueChange={setAccountFilter} />
            </div>
          </div>
        </div>

        <TabsContent value="overview" className="mt-0">
          {stats.total === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-sm text-muted-foreground">No analytics data yet for the selected account.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Trades" value={String(stats.total)} />
                <StatCard label="Win Rate" value={formatPercent(stats.winRate)} />
                <StatCard label="Avg RR" value={`1:${stats.avgRR.toFixed(2)}`} />
                <StatCard
                  label="Net PnL"
                  value={`${stats.totalProfit >= 0 ? "+" : "-"}$${Math.abs(stats.totalProfit).toFixed(2)}`}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
                <StatCard label="Wins" value={String(stats.wins)} />
                <StatCard label="Losses" value={String(stats.losses)} />
                <StatCard
                  label="Total Gross"
                  value={`+$${stats.totalGross.toFixed(2)}`}
                />
              </div>

              {stats.setupStats.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-foreground mb-3">Setup Performance</h2>
                  <div className="grid gap-3 md:hidden">
                    {stats.setupStats
                      .sort((a, b) => b.total - a.total)
                      .map((setup) => (
                        <div key={setup.setup} className="rounded-xl border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{setup.setup}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{setup.total} trades</p>
                            </div>
                            <ProfitDisplay value={setup.profit} />
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">Win Rate: {formatPercent(setup.winRate)}</p>
                        </div>
                      ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-lg border md:block">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Setup</th>
                          <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Trades</th>
                          <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Win Rate</th>
                          <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.setupStats
                          .sort((a, b) => b.total - a.total)
                          .map((s, i) => (
                            <motion.tr
                              key={s.setup}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                              className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-2 px-4 text-sm font-medium">{s.setup}</td>
                              <td className="py-2 px-4 text-sm tabular">{s.total}</td>
                              <td className="py-2 px-4 text-sm tabular">{formatPercent(s.winRate)}</td>
                              <td className="py-2 px-4 text-right"><ProfitDisplay value={s.profit} /></td>
                            </motion.tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="chart" className="mt-0">
          {stats.total === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-sm text-muted-foreground">Log trades for this account to unlock chart insights.</p>
            </div>
          ) : (
            <TooltipProvider delayDuration={120}>
              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <section className={fintechCardClass}>
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-medium text-foreground">Win vs Loss</h2>
                        <p className="mt-1 text-xs text-muted-foreground">A fast view of your trading accuracy and consistency.</p>
                      </div>
                      <div className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Overview
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_220px] md:items-center">
                      <ChartContainer config={analyticsChartConfig} className="h-[240px] w-full sm:h-[280px]">
                        <PieChart>
                          <ChartTooltip
                            cursor={false}
                            content={
                              <ChartTooltipContent
                                hideIndicator
                                labelFormatter={(_, payload) => payload?.[0]?.name}
                                formatter={(value, _, item) => (
                                  <div className="grid min-w-[10rem] gap-1.5">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Total trades</span>
                                      <span className="font-mono-price font-medium text-foreground">{Number(value)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Win rate</span>
                                      <span className="font-mono-price font-medium text-foreground">{formatPercent(stats.winRate)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Average R</span>
                                      <span className="font-mono-price font-medium text-foreground">{`1:${stats.avgRR.toFixed(2)}`}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Share</span>
                                      <span className="font-mono-price font-medium text-foreground">{formatPercent(item.payload.percentage)}</span>
                                    </div>
                                  </div>
                                )}
                              />
                            }
                          />
                          <Pie
                            animationDuration={650}
                            animationEasing="ease-out"
                            data={winLossData}
                            dataKey="value"
                            endAngle={-270}
                            innerRadius={78}
                            outerRadius={112}
                            paddingAngle={3}
                            startAngle={90}
                            stroke="hsl(var(--card))"
                            strokeWidth={6}
                          >
                            <Label
                              content={({ viewBox }) => {
                                const center =
                                  viewBox && "cx" in viewBox && "cy" in viewBox
                                    ? { cx: viewBox.cx, cy: viewBox.cy }
                                    : null;

                                if (!center || typeof center.cx !== "number" || typeof center.cy !== "number") {
                                  return null;
                                }

                                return (
                                  <text x={center.cx} y={center.cy} textAnchor="middle" dominantBaseline="middle">
                                    <tspan x={center.cx} y={center.cy - 10} fill="hsl(var(--muted-foreground))" fontSize="12">
                                      Win Rate
                                    </tspan>
                                    <tspan x={center.cx} y={center.cy + 22} fill="hsl(var(--foreground))" fontSize="30" fontWeight="700">
                                      {formatPercent(stats.winRate)}
                                    </tspan>
                                  </text>
                                );
                              }}
                              position="center"
                            />
                            {winLossData.map((entry) => (
                              <Cell key={entry.key} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>

                      <div className="space-y-4">
                        {[
                          {
                            label: "Wins",
                            value: stats.wins,
                            percentage: stats.winRate,
                            color: WIN_COLOR,
                          },
                          {
                            label: "Losses",
                            value: stats.losses,
                            percentage: stats.total > 0 ? (stats.losses / stats.total) * 100 : 0,
                            color: LOSS_COLOR,
                          },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]">
                            <div className="mb-4 flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                            </div>
                            <p className="text-3xl font-semibold tracking-tight text-foreground">{formatPercent(item.percentage)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.value} trades</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className={fintechCardClass}>
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-medium text-foreground">Performance by Emotion</h2>
                        <p className="mt-1 text-xs text-muted-foreground">Compare which emotional states are helping or hurting your results.</p>
                      </div>
                      <div className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Ranked
                      </div>
                    </div>

                    {hasEmotionData ? (
                      <div className="space-y-3">
                        {emotionPerformance.map((item) => {
                          const width = `${Math.max((Math.abs(item.profit) / maxEmotionProfit) * 50, 2)}%`;

                          return (
                            <Tooltip key={item.emotion}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="group grid w-full gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)] sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)_auto] sm:items-center"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{item.emotion}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{item.trades} trades</p>
                                  </div>

                                  <div className="relative h-3 overflow-hidden rounded-full bg-muted/70">
                                    <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
                                    <div
                                      className="absolute inset-y-0 rounded-full transition-all duration-300 group-hover:brightness-110"
                                      style={{
                                        backgroundColor: item.fill,
                                        width,
                                        left: item.profit >= 0 ? "50%" : undefined,
                                        right: item.profit < 0 ? "50%" : undefined,
                                      }}
                                    />
                                  </div>

                                  <div className={cn("font-mono-price text-sm font-semibold sm:text-right", item.profit > 0 ? "text-success" : item.profit < 0 ? "text-danger" : "text-muted-foreground")}>
                                    {formatCurrency(item.profit)}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-xl border border-border/60 bg-background px-3 py-2 shadow-xl">
                                <div className="grid gap-1.5 text-xs">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Emotion</span>
                                    <span className="font-medium text-foreground">{item.emotion}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Trades</span>
                                    <span className="font-mono-price font-medium text-foreground">{item.trades}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Total PnL</span>
                                    <span className="font-mono-price font-medium text-foreground">{formatCurrency(item.profit)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Avg / trade</span>
                                    <span className="font-mono-price font-medium text-foreground">{formatCurrency(item.avgProfit)}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/60">
                        <p className="text-sm text-muted-foreground">Add emotion data to trades in this account to see emotional performance.</p>
                      </div>
                    )}
                  </section>
                </div>

                <section className={fintechCardClass}>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-medium text-foreground">Performance by Session</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Spot which session consistently produces your strongest outcomes.</p>
                    </div>
                    <div className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Sessions
                    </div>
                  </div>

                  {hasSessionData ? (
                    <ChartContainer config={analyticsChartConfig} className="h-[280px] w-full sm:h-[320px]">
                      <BarChart accessibilityLayer data={sessionPerformance} margin={{ left: 12, right: 12, top: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis axisLine={false} dataKey="session" tick={renderSessionTick} tickLine={false} tickMargin={18} />
                        <YAxis
                          axisLine={false}
                          domain={sessionDomain}
                          tickFormatter={formatAxisCurrency}
                          tickLine={false}
                          tickMargin={8}
                          width={72}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                        <ChartTooltip
                          cursor={{ fill: "hsl(var(--muted) / 0.24)" }}
                          content={
                            <ChartTooltipContent
                              hideIndicator
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.session}
                              formatter={(value, _, item) => (
                                <div className="grid min-w-[10rem] gap-1.5">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Total PnL</span>
                                    <span className="font-mono-price font-medium text-foreground">{formatCurrency(Number(value))}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Trades</span>
                                    <span className="font-mono-price font-medium text-foreground">{item.payload.trades}</span>
                                  </div>
                                </div>
                              )}
                            />
                          }
                        />
                        <Bar activeBar={{ stroke: "rgba(15, 23, 42, 0.18)", strokeWidth: 1.5 }} animationDuration={650} barSize={54} dataKey="profit" minPointSize={10} radius={[10, 10, 0, 0]}>
                          <LabelList dataKey="profit" fill="hsl(var(--foreground))" fontSize={12} formatter={(value: number) => formatCurrency(Number(value))} position="top" />
                          {sessionPerformance.map((entry) => (
                            <Cell key={entry.session} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/60">
                      <p className="text-sm text-muted-foreground">Add session data to trades in this account to see session performance.</p>
                    </div>
                  )}
                </section>
              </div>
            </TooltipProvider>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <section className={fintechCardClass}>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">Trading Calendar</h2>
                <p className="mt-1 text-xs text-muted-foreground">Track daily PnL and trade activity.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-border/60 bg-background/80 hover:bg-accent"
                  onClick={() => {
                    setCurrentMonth((month) => subMonths(month, 1));
                    setSelectedDateKey(null);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[11rem] rounded-full border border-border/60 bg-background/80 px-4 py-2 text-center shadow-sm">
                  <p className="text-sm font-medium text-foreground">{format(currentMonth, "MMMM yyyy")}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-border/60 bg-background/80 hover:bg-accent"
                  onClick={() => {
                    setCurrentMonth((month) => addMonths(month, 1));
                    setSelectedDateKey(null);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              {[
                { label: "Monthly PnL", value: formatCurrency(monthlySummary.totalProfit), valueClass: monthlySummary.totalProfit > 0 ? "text-emerald-600" : monthlySummary.totalProfit < 0 ? "text-rose-600" : "text-foreground" },
                { label: "Total Trades", value: `${monthlySummary.totalTrades}`, valueClass: "text-foreground" },
                { label: "Win Rate", value: formatPercent(monthlySummary.winRate), valueClass: "text-foreground" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.28)]">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className={cn("mt-3 text-3xl font-semibold tracking-tight", item.valueClass)}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="min-w-[840px] lg:min-w-[980px] xl:min-w-0">
                <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-end">
                  <div className="grid grid-cols-7 gap-3">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="px-2 py-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="hidden px-2 py-1 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground xl:block">
                    Week
                  </div>
                </div>

                <div className="space-y-3">
                  {calendarWeeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-stretch">
                      <div className="grid grid-cols-7 gap-3">
                        {week.days.map((day) => (
                          <Tooltip key={day.dateKey}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setSelectedDateKey(day.dateKey)}
                                className={cn(
                                  "min-h-[90px] rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(15,23,42,0.32)]",
                                  getCalendarTone(day.totalProfit, day.tradeCount),
                                  !day.inCurrentMonth && "border-border/60 bg-muted/35 text-muted-foreground opacity-60 shadow-none hover:translate-y-0 hover:bg-muted/35 hover:shadow-none",
                                  selectedDateKey === day.dateKey && "ring-2 ring-primary/30",
                                )}
                              >
                                <div className="mb-3">
                                  <span className={cn("text-xs font-medium", day.inCurrentMonth ? "text-muted-foreground" : "text-muted-foreground/80")}>
                                    {format(day.date, "d")}
                                  </span>
                                </div>
                                <p className={cn("max-w-full break-words font-mono-price text-[11px] font-semibold leading-snug tracking-[-0.03em] sm:text-[13px]", day.inCurrentMonth ? getPnLTextTone(day.totalProfit, day.tradeCount) : "text-muted-foreground/80")}>
                                  {day.tradeCount > 0 ? formatCurrency(day.totalProfit) : "$0.00"}
                                </p>
                                <p className={cn("mt-3 text-xs", day.inCurrentMonth ? "text-muted-foreground" : "text-muted-foreground/80")}>
                                  {day.tradeCount > 0 ? `${day.tradeCount} trade${day.tradeCount === 1 ? "" : "s"}` : "No trades"}
                                </p>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="rounded-xl border border-border/60 bg-background px-3 py-2 shadow-xl">
                              {day.tradeCount > 0 ? (
                                <div className="grid gap-1.5 text-xs">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Trades</span>
                                    <span className="font-mono-price font-medium text-foreground">{day.tradeCount}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Win rate</span>
                                    <span className="font-mono-price font-medium text-foreground">{formatPercent(day.winRate)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Profit</span>
                                <span className="font-mono-price font-medium text-emerald-600 dark:text-emerald-300">{`+$${day.grossProfit.toFixed(2)}`}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Loss</span>
                                    <span className="font-mono-price font-medium text-rose-600 dark:text-rose-300">{day.grossLoss < 0 ? `-$${Math.abs(day.grossLoss).toFixed(2)}` : "$0.00"}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No trades logged for this day.</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>

                      <div className="flex min-h-[90px] items-center justify-between rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.22)] xl:h-full xl:flex-col xl:items-start xl:justify-center">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{`Week ${weekIndex + 1}`}</p>
                          <p className={cn("mt-1 font-mono-price text-sm font-semibold", week.summary.totalProfit > 0 ? "text-emerald-600" : week.summary.totalProfit < 0 ? "text-rose-600" : "text-foreground")}>
                            {`Week PnL: ${formatCurrency(week.summary.totalProfit)}`}
                          </p>
                        </div>
                        <div className="text-right xl:mt-4 xl:text-left">
                          <p className="text-sm font-medium text-foreground">{`Trades: ${week.summary.tradeCount}`}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{`Win Rate: ${formatPercent(week.summary.winRate)}`}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Sheet open={!!selectedDateKey} onOpenChange={(open) => !open && setSelectedDateKey(null)}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>
                  {selectedDateKey ? format(parseISO(selectedDateKey), "EEEE, MMMM d, yyyy") : "Day Details"}
                </SheetTitle>
                <SheetDescription>
                  {selectedDay && selectedDay.tradeCount > 0
                    ? `${selectedDay.tradeCount} trade${selectedDay.tradeCount === 1 ? "" : "s"} • ${formatCurrency(selectedDay.totalProfit)}`
                    : "No trades were logged for this day."}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {selectedDay && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Trades</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{selectedDay.tradeCount}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Win Rate</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {selectedDay.tradeCount > 0 ? formatPercent((selectedDay.wins / selectedDay.tradeCount) * 100) : formatPercent(0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Profit</p>
                      <p className={cn("mt-2 text-2xl font-semibold", selectedDay.totalProfit > 0 ? "text-emerald-600" : selectedDay.totalProfit < 0 ? "text-rose-600" : "text-foreground")}>
                        {formatCurrency(selectedDay.totalProfit)}
                      </p>
                    </div>
                  </div>
                )}

                {selectedDay?.tradeCount ? (
                  selectedDay.trades
                    .slice()
                    .sort((a, b) => (a.createdAt || a.date).localeCompare(b.createdAt || b.date))
                    .map((trade) => (
                      <div key={trade.id} className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.22)]">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{trade.pair}</p>
                            <p className="text-xs text-muted-foreground">
                              {trade.direction}
                              {trade.session ? ` • ${trade.session}` : ""}
                              {trade.emotion ? ` • ${trade.emotion}` : ""}
                            </p>
                          </div>
                          <ProfitDisplay value={trade.profit} />
                        </div>

                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <ResultBadge result={trade.result} />
                          {trade.setup && <SetupTag label={trade.setup} />}
                        </div>

                        <div className="grid gap-2 text-xs sm:grid-cols-3">
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="mb-1 uppercase tracking-wider text-muted-foreground">Entry</p>
                            <p className="font-mono-price text-foreground">{trade.entry}</p>
                          </div>
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="mb-1 uppercase tracking-wider text-muted-foreground">SL</p>
                            <p className="font-mono-price text-foreground">{trade.stopLoss}</p>
                          </div>
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="mb-1 uppercase tracking-wider text-muted-foreground">TP</p>
                            <p className="font-mono-price text-foreground">{trade.takeProfit}</p>
                          </div>
                        </div>

                        {trade.notes && (
                          <div className="mt-3 rounded-md bg-muted/40 p-3">
                            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Notes</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{trade.notes}</p>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">No trades logged for this date.</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>
      </Tabs>
    </div>
  );
}
