import { differenceInCalendarDays, parseISO } from "date-fns";
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
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  const ageInDays = differenceInCalendarDays(new Date(), parseISO(trade.date));

  if (ageInDays >= 1) {
    return {
      label: "Needs Review",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Not Reviewed",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
}

export function TradeReviewStatusBadge({ trade, reviewed }: TradeReviewStatusBadgeProps) {
  const status = getTradeReviewStatus(trade, reviewed);

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", status.className)}>
      {status.label}
    </span>
  );
}
