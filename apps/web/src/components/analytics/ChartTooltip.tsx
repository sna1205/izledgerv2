import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import {
  formatCurrencyDisplay,
  formatNumberDisplay,
  formatPercentageDisplay,
} from "@/lib/analytics-rendering";

type TooltipMode = "performance" | "outcome" | "distribution";

export function BreakdownChartTooltip({
  active,
  payload,
  label,
  mode = "performance",
  labelFormatter,
}: TooltipProps<ValueType, NameType> & {
  mode?: TooltipMode;
  labelFormatter?: (value: string | number | undefined) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0]?.payload as Record<string, unknown> | undefined;
  const heading = labelFormatter
    ? labelFormatter(label as string | number | undefined)
    : String(label ?? datum?.label ?? datum?.name ?? "");

  return (
    <div className="min-w-[170px] rounded-2xl border border-border/70 bg-popover/96 px-4 py-3 text-xs text-popover-foreground shadow-[0_20px_50px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:shadow-[0_20px_50px_-24px_rgba(1,8,24,0.88)]">
      <p className="font-medium text-foreground">{heading}</p>
      <div className="mt-3 grid gap-1.5">
        {mode === "performance" ? (
          <>
            <p>PnL: {formatCurrencyDisplay(datum?.profit ?? 0)}</p>
            <p>Win rate: {formatPercentageDisplay(datum?.winRate ?? 0)}</p>
            <p>Trades: {formatNumberDisplay(datum?.trades ?? 0)}</p>
          </>
        ) : null}

        {mode === "outcome" ? (
          <>
            <p>Trades: {formatNumberDisplay(datum?.value ?? 0)}</p>
            <p>Share: {formatPercentageDisplay(datum?.percentage ?? 0)}</p>
          </>
        ) : null}

        {mode === "distribution" ? (
          <>
            <p>Trades: {formatNumberDisplay(datum?.trades ?? 0)}</p>
            <p>Share: {formatPercentageDisplay(datum?.share ?? 0)}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
