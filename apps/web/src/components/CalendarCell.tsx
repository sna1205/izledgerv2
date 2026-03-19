import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrencyDisplay, formatNumberDisplay, formatPercentageDisplay, type NormalizedCalendarDay } from "@/lib/analytics-rendering";
import { cn } from "@/lib/utils";

function getDayTone(day: NormalizedCalendarDay) {
  if (day.totalProfit > 0) {
    return "border-success/20 bg-success/10 text-success";
  }

  if (day.totalProfit < 0) {
    return "border-danger/20 bg-danger/10 text-danger";
  }

  return "border-border/70 bg-background/80 text-foreground";
}

export function CalendarCell({
  day,
  selected,
  onClick,
}: {
  day: NormalizedCalendarDay;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip delayDuration={80}>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.99 }}
          onClick={onClick}
          className={cn(
            "group min-h-[128px] rounded-[1.35rem] border p-3 text-left transition-all duration-200",
            getDayTone(day),
            !day.inCurrentMonth && "opacity-45",
            selected && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-foreground/90">{day.dayLabel}</span>
            <span className="rounded-full bg-white/55 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground dark:bg-black/20">
              {day.tradeCount === 0 ? "Flat" : day.totalProfit > 0 ? "Green" : day.totalProfit < 0 ? "Red" : "Flat"}
            </span>
          </div>
          <div className="mt-7">
            <p className={cn("font-mono-price text-xl font-semibold", day.totalProfit === 0 && "text-foreground")}>
              {day.tradeCount > 0 ? formatCurrencyDisplay(day.totalProfit) : "$0.00"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{formatNumberDisplay(day.tradeCount)} trades</p>
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
            <p>PnL: {day.tradeCount > 0 ? formatCurrencyDisplay(day.totalProfit) : "$0.00"}</p>
            <p>Trades: {formatNumberDisplay(day.tradeCount)}</p>
            <p>Win rate: {formatPercentageDisplay(day.winRate)}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
