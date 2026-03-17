import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, Lock, ShieldOff } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ShareTradeCard } from "@/components/ShareTradeCard";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getPublicTradeShare } from "@/lib/api/trade-shares";
import { formatMoney, formatPrice, formatSharedTradeDate } from "@/lib/trade-sharing";

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/80 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function SharedTradeUnavailable({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f6f9fc_0%,#eef4fb_100%)] px-4 py-10 dark:bg-[linear-gradient(180deg,#09111d_0%,#0d1827_100%)]">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200/70 bg-white/85 p-8 text-center shadow-[0_40px_140px_-60px_rgba(15,23,42,0.4)] backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Share unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
        <Button asChild className="mt-6">
          <Link to="/">Back to IZLedger</Link>
        </Button>
      </div>
    </main>
  );
}

function getUnavailableMessage(error: unknown, shareId: string) {
  if (!shareId) {
    return "This shared trade link is incomplete.";
  }

  if (!(error instanceof ApiError)) {
    return "This shared trade link is missing, revoked, or has expired.";
  }

  if (error.code === "INVALID_INPUT") {
    return "This shared trade link is invalid.";
  }

  if (error.code === "TRADE_SHARE_NOT_FOUND") {
    return "This shared trade link was not found.";
  }

  if (error.code === "TRADE_SHARE_REVOKED") {
    return "This shared trade link was revoked by its owner.";
  }

  if (error.code === "TRADE_SHARE_EXPIRED") {
    return "This shared trade link has expired.";
  }

  return error.message || "This shared trade link is missing, revoked, or has expired.";
}

export default function SharedTradePage() {
  const { shareId = "" } = useParams<{ shareId: string }>();

  const tradeQuery = useQuery({
    queryKey: ["shared-trade", shareId],
    queryFn: () => getPublicTradeShare(shareId),
    retry: false,
    enabled: Boolean(shareId),
  });

  if (tradeQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f6f9fc_0%,#eef4fb_100%)] px-4 py-10 dark:bg-[linear-gradient(180deg,#09111d_0%,#0d1827_100%)]">
        <div className="rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Loading shared trade...
        </div>
      </main>
    );
  }

  if (tradeQuery.isError || !tradeQuery.data?.trade) {
    const message = getUnavailableMessage(tradeQuery.error, shareId);

    return <SharedTradeUnavailable message={message} />;
  }

  const { trade } = tradeQuery.data;
  const details = [
    trade.entry !== null ? { label: "Entry", value: formatPrice(trade.entry) } : null,
    trade.stopLoss !== null ? { label: "Stop Loss", value: formatPrice(trade.stopLoss) } : null,
    trade.takeProfit !== null ? { label: "Take Profit", value: formatPrice(trade.takeProfit) } : null,
    trade.pnl !== null ? { label: "PnL", value: formatMoney(trade.pnl) } : null,
    trade.rr !== null ? { label: "Risk : Reward", value: `1:${trade.rr.toFixed(2)}` } : null,
    trade.accountName ? { label: "Account", value: trade.accountName } : null,
    trade.setup ? { label: "Setup", value: trade.setup } : null,
    trade.session ? { label: "Session", value: trade.session } : null,
    trade.emotion ? { label: "Emotion", value: trade.emotion } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4fb_32%,#f7efe2_100%)] px-4 py-8 dark:bg-[linear-gradient(180deg,#06101d_0%,#0d1828_46%,#1b1420_100%)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Lock className="h-3.5 w-3.5" />
              Read-only shared trade
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-4xl">
              {trade.pair} case study
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              A focused single-trade snapshot shared from IZLedger. No private journal navigation, account switching, or edit controls are exposed here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatSharedTradeDate(trade.date)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
              <Activity className="h-3.5 w-3.5" />
              {trade.result} trade
            </span>
          </div>
        </header>

        <ShareTradeCard trade={trade} />

        {details.length ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Shared details</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Only the fields approved in the share settings are shown below.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {details.map((detail) => (
                <DetailBlock key={detail.label} label={detail.label} value={detail.value} />
              ))}
            </div>
          </section>
        ) : null}

        {trade.notes ? (
          <section className="rounded-[30px] border border-white/65 bg-white/82 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Trade notes</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{trade.notes}</p>
          </section>
        ) : null}

        {trade.screenshots.length ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Chart snapshots</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Shared screenshots are displayed separately from the private journal gallery.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {trade.screenshots.map((screenshot, index) => (
                <div
                  key={`${screenshot}-${index}`}
                  className="overflow-hidden rounded-[28px] border border-white/65 bg-white/82 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5"
                >
                  <img src={screenshot} alt={`${trade.pair} shared screenshot ${index + 1}`} className="aspect-[16/10] w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
