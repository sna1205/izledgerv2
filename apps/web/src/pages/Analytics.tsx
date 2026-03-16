import { useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AccountFilterSelect } from "@/components/AccountFilterSelect";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAccounts } from "@/lib/api/accounts";
import { getAnalyticsBreakdowns, getAnalyticsCalendar } from "@/lib/api/analytics";
import { resolveAccountFilter, useAccountFilter } from "@/lib/account-filter";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function getProfitTone(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-foreground";
}

function PerformanceList({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{
    key: string;
    label: string;
    trades: number;
    winRate: number;
    profit: number;
  }>;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No data yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 6).map((row) => (
            <div key={row.key} className="rounded-xl border bg-background/70 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.trades} trades • {row.winRate.toFixed(1)}% win rate</p>
                </div>
                <p className={cn("text-sm font-semibold", getProfitTone(row.profit))}>{formatCurrency(row.profit)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Analytics() {
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  useEffect(() => {
    setSelectedDate(null);
  }, [resolvedAccountFilter, currentMonth]);

  const accountId = resolvedAccountFilter === "all" ? undefined : resolvedAccountFilter;
  const breakdownsQuery = useQuery({
    queryKey: ["analytics-breakdowns", accountId],
    queryFn: () => getAnalyticsBreakdowns(accountId),
  });
  const calendarQuery = useQuery({
    queryKey: ["analytics-calendar", accountId, currentMonth],
    queryFn: () => getAnalyticsCalendar(currentMonth, accountId),
  });

  if ((breakdownsQuery.isLoading && !breakdownsQuery.data) || (calendarQuery.isLoading && !calendarQuery.data)) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading analytics...</div>;
  }

  if (breakdownsQuery.isError || calendarQuery.isError) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">Analytics unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">We could not load analytics data right now.</p>
        </div>
      </div>
    );
  }

  const breakdowns = breakdownsQuery.data;
  const calendar = calendarQuery.data;
  const selectedDay = calendar.days.find((day) => day.date === selectedDate) ?? null;

  return (
    <div className="w-full min-w-0 p-4 sm:p-6">
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 z-20 mb-6 bg-background/95 pb-4 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border bg-muted/40 p-1 sm:w-[320px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            <div className="w-full lg:w-auto">
              <AccountFilterSelect accounts={accounts} value={resolvedAccountFilter} onValueChange={setAccountFilter} />
            </div>
          </div>
        </div>

        <TabsContent value="overview" className="mt-0">
          {breakdowns.summary.totalTrades === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
              <p className="text-base font-medium text-foreground">No analytics data yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Add trades to start measuring setups, sessions, emotions, and performance trends.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Trades" value={String(breakdowns.summary.totalTrades)} />
                <StatCard label="Win Rate" value={`${breakdowns.summary.winRate.toFixed(1)}%`} />
                <StatCard label="Avg RR" value={`1:${breakdowns.summary.avgRR.toFixed(2)}`} />
                <StatCard label="Net PnL" value={formatCurrency(breakdowns.summary.totalProfit)} />
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <PerformanceList
                  title="Setup Performance"
                  description="Which setups are paying you and which need work."
                  rows={breakdowns.setupPerformance}
                />
                <PerformanceList
                  title="Session Performance"
                  description="See where your edge appears most often."
                  rows={breakdowns.sessionPerformance}
                />
                <PerformanceList
                  title="Emotion Performance"
                  description="Track how state of mind is influencing results."
                  rows={breakdowns.emotionPerformance}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="breakdowns" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-2">
            <PerformanceList
              title="Account Performance"
              description="Compare results across each account."
              rows={breakdowns.accountPerformance}
            />
            <PerformanceList
              title="Pair Performance"
              description="The instruments creating your biggest swings."
              rows={breakdowns.pairPerformance}
            />
          </div>

          <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">Win / Loss Split</h2>
              <p className="mt-1 text-sm text-muted-foreground">A simple distribution of outcomes for the current filter.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {breakdowns.winLoss.map((entry) => (
                <div key={entry.key} className="rounded-xl border bg-background/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">{entry.name}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{entry.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.percentage.toFixed(1)}% of trades</p>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{format(new Date(`${currentMonth}-01T00:00:00`), "MMMM yyyy")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Review PnL and trade frequency by day.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(format(subMonths(new Date(`${currentMonth}-01T00:00:00`), 1), "yyyy-MM"))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(format(addMonths(new Date(`${currentMonth}-01T00:00:00`), 1), "yyyy-MM"))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="space-y-2">
                {calendar.weeks.map((week, index) => (
                  <div key={`${week.days[0]?.date ?? index}`} className="grid grid-cols-7 gap-2">
                    {week.days.map((day) => (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDate(day.date)}
                        className={cn(
                          "min-h-[92px] rounded-xl border px-3 py-3 text-left transition-colors",
                          !day.inCurrentMonth && "opacity-50",
                          selectedDate === day.date && "border-primary",
                        )}
                      >
                        <p className="text-xs text-muted-foreground">{day.date.slice(-2)}</p>
                        <p className={cn("mt-3 text-sm font-semibold", getProfitTone(day.totalProfit))}>
                          {day.tradeCount > 0 ? formatCurrency(day.totalProfit) : "$0.00"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{day.tradeCount} trades</p>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Day Summary</h2>
              {selectedDay ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border bg-background/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{selectedDay.date}</p>
                    <p className={cn("mt-2 text-2xl font-semibold", getProfitTone(selectedDay.totalProfit))}>
                      {formatCurrency(selectedDay.totalProfit)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-xl border bg-background/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Trades</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{selectedDay.tradeCount}</p>
                    </div>
                    <div className="rounded-xl border bg-background/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Win Rate</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{selectedDay.winRate.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl border bg-background/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Gross Profit</p>
                      <p className="mt-2 text-lg font-semibold text-emerald-600">{formatCurrency(selectedDay.grossProfit)}</p>
                    </div>
                    <div className="rounded-xl border bg-background/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Gross Loss</p>
                      <p className="mt-2 text-lg font-semibold text-rose-600">{formatCurrency(selectedDay.grossLoss)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  Select a day to inspect its trading summary.
                </div>
              )}
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
