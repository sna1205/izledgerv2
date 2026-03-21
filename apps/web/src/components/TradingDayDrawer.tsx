import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarRange, ChevronRight, Gauge, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/ui/TagChip";
import { DataBadge } from "@/components/DataBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import {
  formatCurrencyDisplay,
  formatNumberDisplay,
  formatPercentageDisplay,
  type NormalizedCalendarDay,
} from "@/lib/analytics-rendering";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

type DayStat = {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
};

export function TradingDayDrawer({
  day,
  trades,
  open,
  onClose,
  onTradeClick,
  onViewDayAnalysis,
  onAddReview,
  stats,
  sessions,
  emotions,
}: {
  day: NormalizedCalendarDay | null;
  trades: Trade[];
  open: boolean;
  onClose: () => void;
  onTradeClick: (tradeId: string) => void;
  onViewDayAnalysis: () => void;
  onAddReview: () => void;
  stats: DayStat[];
  sessions: string[];
  emotions: string[];
}) {
  return (
    <AnimatePresence>
      {open && day ? (
        <>
          <motion.button
            type="button"
            aria-label="Close day drawer"
            className="fixed inset-0 z-40 bg-[hsl(var(--background)/0.68)] backdrop-blur-sm dark:bg-[rgba(2,6,23,0.74)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px] border-l border-border/70 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_34%),linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--background)/0.98))] shadow-[0_0_80px_-24px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:shadow-[0_0_80px_-24px_rgba(1,8,24,0.88)]"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="px-5 py-5 sm:px-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">{day.displayDate}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{formatNumberDisplay(day.tradeCount)} trades</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/85 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 px-5 pb-5 sm:px-6">
                <div className="h-full min-h-0 overflow-y-auto rounded-[2rem] border border-border/70 bg-card/88 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.1),transparent_34%),linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--card)/0.94))] dark:shadow-[0_24px_70px_-34px_rgba(1,8,24,0.82)]">
                  <div className="border-b border-border/60 bg-[linear-gradient(180deg,hsl(var(--primary)/0.10),transparent)] px-5 py-5 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div>
                        <p className="text-label mb-2">PnL</p>
                        <p className={cn("font-mono-price numeric-safe max-w-full text-4xl font-semibold", day.totalProfit > 0 ? "text-success" : day.totalProfit < 0 ? "text-danger" : "text-foreground")}>
                          {formatCurrencyDisplay(day.totalProfit, { showPlus: true })}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground sm:text-right">
                        <p>{formatPercentageDisplay(day.winRate)} win rate</p>
                        <p>{formatNumberDisplay(day.tradeCount)} trades</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 px-5 py-5 sm:px-6">
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium text-foreground">Trades</h3>
                      </div>
                      {trades.length === 0 ? (
                        <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/55 px-4 py-12 text-center text-sm text-muted-foreground dark:bg-white/[0.02]">
                          No trades
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {trades.map((trade) => (
                            <button
                              key={trade.id}
                              type="button"
                              className="w-full rounded-[1.35rem] border border-border/60 bg-background/60 p-4 text-left transition-colors hover:bg-accent/35 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                              onClick={() => onTradeClick(trade.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">{trade.pair}</p>
                                    <DataBadge tone={trade.direction === "Buy" ? "success" : "danger"}>{trade.direction}</DataBadge>
                                    <ResultBadge result={trade.result} />
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    {trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : <span>No setup</span>}
                                    {trade.session ? <TagChip label={trade.session} kind="session" /> : null}
                                    {trade.emotion ? <TagChip label={trade.emotion} kind="emotion" /> : null}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <ProfitDisplay value={trade.profit} />
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="space-y-3 border-t border-border/60 pt-6">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium text-foreground">Stats</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {stats.map((stat) => (
                          <div key={stat.label} className="rounded-[1.35rem] border border-border/60 bg-background/60 px-4 py-4 dark:bg-white/[0.03]">
                            <p className="text-label mb-2">{stat.label}</p>
                            <p className={cn("text-lg font-semibold", stat.tone === "success" && "text-success", stat.tone === "danger" && "text-danger")}>
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-3 border-t border-border/60 pt-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium text-foreground">Context</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.35rem] border border-border/60 bg-background/60 px-4 py-4 dark:bg-white/[0.03]">
                          <p className="text-label mb-3">Sessions</p>
                          <div className="flex flex-wrap gap-2">
                            {sessions.length > 0 ? sessions.map((session) => <TagChip key={session} label={session} kind="session" />) : <span className="text-sm text-muted-foreground">No sessions</span>}
                          </div>
                        </div>
                        <div className="rounded-[1.35rem] border border-border/60 bg-background/60 px-4 py-4 dark:bg-white/[0.03]">
                          <p className="text-label mb-3">Emotions</p>
                          <div className="flex flex-wrap gap-2">
                            {emotions.length > 0 ? emotions.map((emotion) => <TagChip key={emotion} label={emotion} kind="emotion" />) : <span className="text-sm text-muted-foreground">No emotions</span>}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3 border-t border-border/60 pt-6">
                      <div className="flex flex-col gap-3">
                        <Button className="justify-between" onClick={onViewDayAnalysis}>
                          View trades
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="justify-between" onClick={onAddReview}>
                          Add review
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
