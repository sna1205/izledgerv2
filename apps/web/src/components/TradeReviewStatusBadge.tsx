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
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-300",
    };
  }

  const ageInDays = differenceInCalendarDays(new Date(), parseISO(trade.date));

  if (ageInDays >= 1) {
    return {
      label: "Needs Review",
      icon: TriangleAlert,
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-amber-300",
    };
  }

  return {
    label: "Not Reviewed",
    icon: Clock3,
    className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/25 dark:bg-slate-500/10 dark:text-slate-300",
  };
}

export function TradeReviewStatusBadge({ trade, reviewed }: TradeReviewStatusBadgeProps) {
  const status = getTradeReviewStatus(trade, reviewed);
  const Icon = status.icon;

  return (
    <span className={cn("inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight", status.className)}>
      <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
      {status.label}
    </span>
  );
}
