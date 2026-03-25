import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/ui/TagChip";
import { DataBadge } from "@/components/DataBadge";
import { ProfitDisplay } from "@/features/trades/components/ProfitDisplay";
import { ResultBadge } from "@/features/trades/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { formatCurrencyDisplay, formatNumberDisplay, formatPercentageDisplay } from "@/utils/analytics-rendering";
import type { Trade } from "@/types";

type DrawerStat = {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
};

export function BreakdownDrawer({
  open,
  title,
  description,
  stats,
  trades,
  loading,
  onClose,
  onTradeClick,
  onViewAllTrades,
}: {
  open: boolean;
  title: string;
  description: string;
  stats: DrawerStat[];
  trades: Trade[];
  loading: boolean;
  onClose: () => void;
  onTradeClick: (tradeId: string) => void;
  onViewAllTrades: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
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
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px] border-l border-border/70 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_34%),linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--background)/0.98))] text-foreground shadow-[0_0_80px_-24px_rgba(15,23,42,0.28)] dark:shadow-[0_0_80px_-24px_rgba(1,8,24,0.88)]"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-border/60 px-5 py-5 sm:px-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mt-3 text-2xl font-semibold text-foreground">{title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4 dark:bg-white/[0.03]">
                      <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
                      <p className={`numeric-safe mt-2 max-w-full text-lg font-semibold ${
                        stat.tone === "success" ? "text-success" : stat.tone === "danger" ? "text-danger" : "text-foreground"
                      }`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium text-foreground">Trades</h3>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-24 animate-pulse rounded-2xl border border-border/60 bg-background/70 dark:bg-white/[0.03]" />
                    ))}
                  </div>
                ) : trades.length === 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground dark:bg-white/[0.03]">
                    No trades
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trades.map((trade) => (
                      <button
                        key={trade.id}
                        type="button"
                        className="w-full rounded-2xl border border-border/60 bg-background/70 p-4 text-left transition-colors hover:bg-accent/35 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                        onClick={() => onTradeClick(trade.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{trade.pair}</p>
                              <DataBadge tone={trade.direction === "Buy" ? "success" : "danger"}>{trade.direction}</DataBadge>
                              <ResultBadge result={trade.result} />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{new Date(trade.date).toLocaleDateString("en-US")}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : null}
                              {trade.session ? <TagChip label={trade.session} kind="session" /> : null}
                              {trade.emotion ? <TagChip label={trade.emotion} kind="emotion" /> : null}
                            </div>
                          </div>
                          <ProfitDisplay value={trade.profit} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 px-5 py-5 sm:px-6">
                <Button className="w-full justify-between" onClick={onViewAllTrades}>
                  Open trades
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function buildBreakdownDrawerStats(trades: Trade[]): DrawerStat[] {
  const totalTrades = trades.length;
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const wins = trades.filter((trade) => trade.result === "Win").length;
  const bestTrade = trades.reduce<Trade | null>((best, trade) => (best === null || trade.profit > best.profit ? trade : best), null);
  const worstTrade = trades.reduce<Trade | null>((worst, trade) => (worst === null || trade.profit < worst.profit ? trade : worst), null);

  return [
    { label: "Net PnL", value: formatCurrencyDisplay(totalProfit), tone: totalProfit > 0 ? "success" : totalProfit < 0 ? "danger" : "default" },
    { label: "Win Rate", value: totalTrades > 0 ? formatPercentageDisplay((wins / totalTrades) * 100) : "0.0%" },
    { label: "Trades", value: formatNumberDisplay(totalTrades) },
    { label: "Best / Worst", value: `${formatCurrencyDisplay(bestTrade?.profit ?? 0)} / ${formatCurrencyDisplay(worstTrade?.profit ?? 0)}` },
  ];
}
