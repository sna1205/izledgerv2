import { CameraOff } from "lucide-react";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { Trade } from "@/lib/types";

interface TradeReviewSummaryProps {
  trade: Trade;
}

export function TradeReviewSummary({ trade }: TradeReviewSummaryProps) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{trade.pair}</h3>
            <ResultBadge result={trade.result} />
            {trade.setup && <SetupTag label={trade.setup} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {trade.date} • {trade.direction}
            {trade.session ? ` • ${trade.session}` : ""}
            {trade.emotion ? ` • ${trade.emotion}` : ""}
          </p>
        </div>
        <ProfitDisplay value={trade.profit} className="text-base" />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="mb-1 uppercase tracking-[0.18em] text-muted-foreground">Entry</p>
            <p className="font-mono-price text-sm text-foreground">{trade.entry}</p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="mb-1 uppercase tracking-[0.18em] text-muted-foreground">SL</p>
            <p className="font-mono-price text-sm text-foreground">{trade.stopLoss}</p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="mb-1 uppercase tracking-[0.18em] text-muted-foreground">TP</p>
            <p className="font-mono-price text-sm text-foreground">{trade.takeProfit}</p>
          </div>
        </div>

        {trade.screenshots[0] ? (
          <div className="overflow-hidden rounded-lg border">
            <img src={trade.screenshots[0]} alt={`${trade.pair} screenshot`} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            <div className="text-center text-xs">
              <CameraOff className="mx-auto mb-2 h-4 w-4" />
              No screenshot
            </div>
          </div>
        )}
      </div>

      {trade.notes && (
        <div className="mt-4 rounded-lg border bg-card px-3 py-2">
          <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Trade Notes</p>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{trade.notes}</p>
        </div>
      )}
    </div>
  );
}
