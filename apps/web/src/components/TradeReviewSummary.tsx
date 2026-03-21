import { format, parseISO } from "date-fns";
import { CameraOff } from "lucide-react";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { TagChip } from "@/components/ui/TagChip";
import { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TradeReviewSummaryProps {
  trade: Trade;
  variant?: "card" | "embedded";
}

function formatTradeDate(date: string) {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

function PriceMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 px-3.5 py-3 dark:bg-white/[0.03]">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-mono-price text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function TradeReviewSummary({ trade, variant = "card" }: TradeReviewSummaryProps) {
  const embedded = variant === "embedded";

  return (
    <div className={cn(
      "space-y-4",
      !embedded && "rounded-[1.5rem] border border-border/70 bg-background/75 p-4 shadow-sm dark:bg-white/[0.02]",
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{trade.pair}</h3>
            <ResultBadge result={trade.result} />
            {trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} className="text-[11px]" /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatTradeDate(trade.date)}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{trade.direction}</span>
            {trade.session ? <><span aria-hidden="true">·</span><span>{trade.session}</span></> : null}
            {trade.emotion ? <><span aria-hidden="true">·</span><span>{trade.emotion}</span></> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {trade.session ? <TagChip label={trade.session} kind="session" className="text-[11px]" /> : null}
            {trade.emotion ? <TagChip label={trade.emotion} kind="emotion" className="text-[11px]" /> : null}
          </div>
        </div>
        <ProfitDisplay value={trade.profit} className="text-xl font-semibold sm:text-2xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_168px]">
        <PriceMetric label="Entry" value={trade.entry} />
        <PriceMetric label="SL" value={trade.stopLoss} />
        <PriceMetric label="TP" value={trade.takeProfit} />

        {trade.screenshots[0] ? (
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 sm:col-span-2 xl:col-span-1 dark:bg-white/[0.03]">
            <img
              src={trade.screenshots[0]}
              alt={`${trade.pair} screenshot`}
              className="h-full min-h-[110px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/55 to-transparent px-3 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <p className="text-xs font-medium text-white/95">Screenshot</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[110px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/40 text-muted-foreground sm:col-span-2 xl:col-span-1 dark:bg-white/[0.02]">
            <div className="text-center text-xs">
              <CameraOff className="mx-auto mb-2 h-4 w-4" />
              No screenshot
            </div>
          </div>
        )}
      </div>

      {!embedded && trade.notes && (
        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-medium text-muted-foreground">Notes</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{trade.notes}</p>
        </div>
      )}
    </div>
  );
}
