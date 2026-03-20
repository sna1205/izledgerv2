import { differenceInCalendarDays, parseISO } from "date-fns";
import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Trade } from "@/lib/types";

interface TradeReviewStatusBadgeProps {
  trade: Trade;
  reviewed: boolean;
}

function getTradeReviewStatus(trade: Trade, reviewed: boolean) {
  if (reviewed) {
    return {
      label: "Reviewed",
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/90 dark:text-emerald-200",
    };
  }

  const ageInDays = differenceInCalendarDays(new Date(), parseISO(trade.date));

  if (ageInDays >= 1) {
    return {
      label: "Needs Review",
      icon: TriangleAlert,
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/90 dark:text-amber-200",
    };
  }

  return {
    label: "Not Reviewed",
    icon: Clock3,
    className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  };
}

export function TradeReviewStatusBadge({ trade, reviewed }: TradeReviewStatusBadgeProps) {
  const status = getTradeReviewStatus(trade, reviewed);
  const Icon = status.icon;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-tight",
        status.className,
      )}
    >
      <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
      {status.label}
    </span>
  );
}
