import { ArrowDownRight, ArrowUpRight, Camera, ShieldCheck } from "lucide-react";
import { SharedTradeView, formatMoney, formatPrice, formatSharedTradeDate } from "@/lib/trade-sharing";
import { cn } from "@/lib/utils";

function DetailPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/65 bg-white/80 px-4 py-3 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}

export function ShareTradeCard({
  trade,
  className,
}: {
  trade: SharedTradeView;
  className?: string;
}) {
  const detailItems = [
    trade.entry !== null ? { label: "Entry", value: formatPrice(trade.entry) } : null,
    trade.stopLoss !== null ? { label: "Stop Loss", value: formatPrice(trade.stopLoss) } : null,
    trade.takeProfit !== null ? { label: "Take Profit", value: formatPrice(trade.takeProfit) } : null,
    trade.rr !== null ? { label: "Risk : Reward", value: `1:${trade.rr.toFixed(2)}` } : null,
    trade.pnl !== null ? { label: "PnL", value: formatMoney(trade.pnl) } : null,
    trade.accountName ? { label: "Account", value: trade.accountName } : null,
    trade.setup ? { label: "Setup", value: trade.setup } : null,
    trade.session ? { label: "Session", value: trade.session } : null,
    trade.emotion ? { label: "Emotion", value: trade.emotion } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const directionStyles =
    trade.direction === "Buy"
      ? "border-emerald-300/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200"
      : "border-rose-300/70 bg-rose-500/12 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200";

  const resultStyles =
    trade.result === "Win"
      ? "border-emerald-300/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200"
      : "border-rose-300/70 bg-rose-500/12 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[34px] border border-slate-200/70 bg-[linear-gradient(145deg,#f8fbff_0%,#eef4ff_42%,#fff9f0_100%)] p-6 text-slate-950 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[linear-gradient(145deg,#07111f_0%,#0d1c2f_46%,#1f1820_100%)] dark:text-white sm:p-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.16),transparent_24%)]" />

      <div className="relative space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              IZLedger Shared Trade
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-[42px]">{trade.pair}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{formatSharedTradeDate(trade.date)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold", directionStyles)}>
              {trade.direction === "Buy" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {trade.direction}
            </span>
            <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold", resultStyles)}>
              {trade.result}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {detailItems.map((item) => (
            <DetailPill key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        {trade.notes ? (
          <section className="rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Trade Notes</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{trade.notes}</p>
          </section>
        ) : null}

        {trade.screenshots.length ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              <Camera className="h-3.5 w-3.5" />
              Chart Context
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/70 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/5">
                <img src={trade.screenshots[0]} alt={`${trade.pair} shared screenshot`} className="aspect-[16/10] h-full w-full object-cover" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                {trade.screenshots.slice(1, 3).map((screenshot, index) => (
                  <div
                    key={`${screenshot}-${index}`}
                    className="overflow-hidden rounded-[24px] border border-white/70 bg-white/70 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/5"
                  >
                    <img src={screenshot} alt={`${trade.pair} shared screenshot ${index + 2}`} className="aspect-[16/10] h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
