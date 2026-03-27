import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMoneyDisplay, formatNumberDisplay, formatPercentageDisplay, type NormalizedCalendarDay } from "@/utils/analytics-rendering";
import { cn } from "@/utils/class-names";

function getDayTone(day: NormalizedCalendarDay) {
  if (day.totalProfit > 0) {
    return "border-success/10 bg-success/[0.085] text-success dark:border-success/12 dark:bg-success/[0.12]";
  }

  if (day.totalProfit < 0) {
    return "border-danger/10 bg-danger/[0.085] text-danger dark:border-danger/12 dark:bg-danger/[0.12]";
  }

  return "border-border/35 bg-background/55 text-foreground dark:border-white/8 dark:bg-white/[0.03]";
}

function isToday(date: string) {
  return date === new Date().toISOString().slice(0, 10);
}

export function CalendarCell({
  day,
  selected,
  onClick,
  currency,
}: {
  day: NormalizedCalendarDay;
  selected: boolean;
  onClick: () => void;
  currency?: string | null;
}) {
  const activeDay = day.tradeCount > 0;
  const today = isToday(day.date);

  return (
    <Tooltip delayDuration={80}>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.995 }}
          onClick={onClick}
          className={cn(
            "group min-h-[104px] overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors duration-200",
            getDayTone(day),
            activeDay
              ? "shadow-[0_10px_30px_-24px_rgba(15,23,42,0.28)]"
              : "hover:bg-accent/28 dark:hover:bg-white/[0.05]",
            !day.inCurrentMonth && "opacity-38",
            today && "ring-1 ring-primary/35 ring-inset",
            selected && "ring-2 ring-primary/45 ring-offset-2 ring-offset-background",
          )}
        >
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "text-sm font-medium",
                  activeDay ? "text-foreground/92" : "text-muted-foreground",
                )}
              >
                {day.dayLabel}
              </span>
              {today ? (
                <span className="h-2 w-2 rounded-full bg-primary/60" aria-hidden="true" />
              ) : null}
            </div>

            {activeDay ? (
              <div className="pt-5">
                <p className="font-mono-price numeric-safe max-w-full text-[15px] font-semibold text-foreground">
                  {formatMoneyDisplay(day.totalProfit, { currency, fallback: "--" })}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatNumberDisplay(day.tradeCount)} {day.tradeCount === 1 ? "trade" : "trades"}
                </p>
              </div>
            ) : null}
          </div>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-2xl border border-border/70 bg-popover/95 px-4 py-3 shadow-lg backdrop-blur-xl">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{day.displayDate}</span>
          </div>
          <div className="grid gap-1 text-muted-foreground">
            {day.tradeCount > 0 ? (
              <>
                <p>PnL: {formatMoneyDisplay(day.totalProfit, { currency, fallback: "--" })}</p>
                <p>Trades: {formatNumberDisplay(day.tradeCount)}</p>
                <p>Win rate: {formatPercentageDisplay(day.winRate)}</p>
              </>
            ) : (
              <p>No trades logged.</p>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
