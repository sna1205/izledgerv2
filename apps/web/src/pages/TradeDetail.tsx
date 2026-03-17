import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { TradeReviewContent } from "@/components/TradeReviewContent";
import { TradeReviewDialog } from "@/components/TradeReviewDialog";
import { TradeReviewStatusBadge } from "@/components/TradeReviewStatusBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { getAccountById } from "@/lib/accounts";
import { addReview, getReviewByTradeId, updateReview } from "@/lib/reviews";
import { deleteTrade, getTradeById, updateTrade } from "@/lib/trades";
import { cn } from "@/lib/utils";
import { Review, Trade } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatTradeDate(date: string) {
  return format(parseISO(date), "MMMM d, yyyy");
}

function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-sm sm:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className={cn("mt-2 text-sm font-medium text-foreground", valueClassName)}>{value}</div>
    </div>
  );
}

function InsightRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function ScreenshotGalleryCard({
  trade,
  onAddScreenshot,
}: {
  trade: Trade;
  onAddScreenshot: () => void;
}) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  return (
    <>
      <SectionCard
        title="Screenshot Gallery"
        description="Execution charts, post-trade markup, and context images for future review."
        action={
          <Button variant="outline" size="sm" onClick={onAddScreenshot}>
            <ImagePlus className="mr-1 h-4 w-4" />
            Add Screenshot
          </Button>
        }
      >
        {trade.screenshots.length > 0 ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPreviewSrc(trade.screenshots[0])}
              className="group block w-full overflow-hidden rounded-2xl border bg-muted/20 text-left"
            >
              <img
                src={trade.screenshots[0]}
                alt={`${trade.pair} screenshot 1`}
                className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>

            {trade.screenshots.length > 1 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {trade.screenshots.slice(1).map((src, index) => (
                  <button
                    key={src + index}
                    type="button"
                    onClick={() => setPreviewSrc(src)}
                    className="overflow-hidden rounded-xl border bg-muted/20"
                  >
                    <img
                      src={src}
                      alt={`${trade.pair} screenshot ${index + 2}`}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-background text-muted-foreground">
              <CameraOff className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-foreground">No screenshots added</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Add charts or execution images to improve future review.
            </p>
            <Button className="mt-4" variant="outline" size="sm" onClick={onAddScreenshot}>
              <Camera className="mr-1 h-4 w-4" />
              Add Screenshot
            </Button>
          </div>
        )}
      </SectionCard>

      <Dialog open={!!previewSrc} onOpenChange={(open) => !open && setPreviewSrc(null)}>
        <DialogContent className="max-w-5xl border-0 bg-transparent p-4 shadow-none sm:p-6">
          {previewSrc ? (
            <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl">
              <img src={previewSrc} alt="Trade screenshot preview" className="max-h-[80vh] w-full object-contain" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildInsights({
  trade,
  review,
}: {
  trade: Trade;
  review?: Review;
}) {
  const insights: Array<{ tone: "neutral" | "good" | "warn"; text: string }> = [];

  if (trade.profit > 0 && review && (review.disciplineScore || 0) <= 2) {
    insights.push({ tone: "warn", text: "Strong result, but discipline score is still low." });
  } else if (trade.profit > 0 && trade.emotion === "Frustrated") {
    insights.push({ tone: "warn", text: "Winning trade with a frustrated emotional state." });
  } else if (review?.lessonLearned) {
    insights.push({ tone: "good", text: "Reviewed trade with a clear lesson captured." });
  }

  if (!trade.screenshots.length) {
    insights.push({ tone: "warn", text: "No screenshot added. Chart evidence is missing for future review." });
  }

  if (!review) {
    insights.push({ tone: "neutral", text: "Trade is logged, but reflection is still missing." });
  }

  if (trade.session) {
    insights.push({ tone: "neutral", text: `${trade.session} session context is captured for this execution.` });
  }

  return insights.slice(0, 3);
}

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(() => getTradeById(id || ""));
  const [review, setReview] = useState(() => getReviewByTradeId(id || ""));
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (!trade) {
    return (
      <div className="p-4 sm:p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/trades")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <p className="mt-8 text-center text-muted-foreground">Trade not found.</p>
      </div>
    );
  }

  const handleSave = (updated: Trade) => {
    updateTrade(updated);
    setTrade(updated);
  };

  const handleDelete = () => {
    deleteTrade(trade.id);
    navigate("/trades");
  };

  const handleSaveReview = (updatedReview: Review) => {
    if (review) {
      updateReview(updatedReview);
    } else {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = updatedReview;
      addReview(draft);
    }

    setReview(getReviewByTradeId(trade.id) || updatedReview);
  };

  const accountName = getAccountById(trade.accountId || "")?.name || "Main Account";
  const risk = Math.abs(trade.entry - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entry);
  const rrValue = risk > 0 ? reward / risk : null;
  const reviewUpdatedLabel = review?.updatedAt ? format(parseISO(review.updatedAt), "MMM d, yyyy • h:mm a") : null;
  const insights = useMemo(() => buildInsights({ trade, review }), [trade, review]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-5">
              <Button variant="ghost" size="sm" onClick={() => navigate("/trades")} className="-ml-2 w-fit">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Trades
              </Button>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {trade.pair}
                  </h1>
                  <ResultBadge result={trade.result} />
                  <TradeReviewStatusBadge trade={trade} reviewed={!!review} />
                  {trade.session ? (
                    <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground">
                      {trade.session}
                    </span>
                  ) : null}
                  {trade.emotion ? (
                    <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                      {trade.emotion}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {formatTradeDate(trade.date)}
                    {trade.setup ? ` • ${trade.setup}` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Trade logged
                    </span>
                    <span className={cn("inline-flex items-center gap-2", review ? "text-emerald-700" : "text-muted-foreground")}>
                      <CheckCircle2 className="h-4 w-4" />
                      {review ? `Review completed ${reviewUpdatedLabel || ""}` : "Review pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 xl:max-w-[420px] xl:items-end">
              <div className="w-full rounded-3xl border bg-background/70 p-5 xl:max-w-[360px]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Net Result</p>
                <ProfitDisplay value={trade.profit} className="mt-3 block text-2xl font-semibold sm:text-4xl" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-card px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Direction</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{trade.direction}</p>
                  </div>
                  <div className="rounded-2xl border bg-card px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Account</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{accountName}</p>
                  </div>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
                <Button variant="outline" size="sm" className="w-full xl:w-auto" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit Trade
                </Button>
                <Button variant="outline" size="sm" className="w-full xl:w-auto" onClick={() => setReviewOpen(true)}>
                  <Sparkles className="mr-1 h-4 w-4" />
                  {review ? "Edit Review" : "Write Review"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive xl:w-auto"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <SectionCard
              title="Trade Overview"
              description="Core context for this execution, account, and trader state."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <MetricTile label="Account" value={accountName} />
                <MetricTile label="Direction" value={trade.direction} />
                <MetricTile label="Session" value={trade.session || "Not set"} />
                <MetricTile label="Emotion" value={trade.emotion || "Not set"} />
              </div>
            </SectionCard>

            <SectionCard
              title="Execution Metrics"
              description="Price levels, structure, and trade quality inputs."
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricTile label="Entry" value={<span className="font-mono-price">{trade.entry}</span>} />
                  <MetricTile label="Stop Loss" value={<span className="font-mono-price">{trade.stopLoss}</span>} />
                  <MetricTile label="Take Profit" value={<span className="font-mono-price">{trade.takeProfit}</span>} />
                  <MetricTile
                    label="Risk : Reward"
                    value={rrValue ? `1:${rrValue.toFixed(2)}` : "—"}
                    valueClassName="font-mono-price"
                  />
                </div>

                <div className="rounded-2xl border bg-background/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Performance</p>
                  <div className="mt-3 space-y-1">
                    <InsightRow label="Result" value={<ResultBadge result={trade.result} />} />
                    <InsightRow
                      label="Setup"
                      value={trade.setup ? <SetupTag label={trade.setup} /> : "No setup tagged"}
                    />
                    <InsightRow
                      label="Screenshot Count"
                      value={`${trade.screenshots.length} ${trade.screenshots.length === 1 ? "image" : "images"}`}
                    />
                    <InsightRow
                      label="Review Status"
                      value={review ? "Completed" : "Pending"}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Trade Review"
              description="Capture execution quality, discipline, and the lesson while it is still fresh."
              action={
                <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
                  {review ? "Edit Review" : "Write Review"}
                </Button>
              }
            >
              {review ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Review completed</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {reviewUpdatedLabel || "Recently updated"}
                      </p>
                    </div>
                    <TradeReviewStatusBadge trade={trade} reviewed />
                  </div>
                  <TradeReviewContent review={review} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-background text-muted-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-foreground">No review yet</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Capture mistakes, discipline, and lessons while the trade is still fresh.
                  </p>
                  <Button className="mt-5" onClick={() => setReviewOpen(true)}>
                    Write Review
                  </Button>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <ScreenshotGalleryCard trade={trade} onAddScreenshot={() => setEditOpen(true)} />

            <SectionCard
              title="Journal Notes"
              description="Execution context, planning notes, or post-trade comments."
            >
              {trade.notes ? (
                <div className="rounded-2xl border bg-background/60 p-5">
                  <p className="text-sm leading-7 text-foreground whitespace-pre-wrap">{trade.notes}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                  No notes added yet. Add pre-trade context or post-trade observations to deepen the review.
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Quick Insights"
              description="A lightweight summary of what stands out in this trade journal entry."
            >
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={`${insight.text}-${index}`}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-sm leading-relaxed",
                      insight.tone === "good" && "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
                      insight.tone === "warn" && "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
                      insight.tone === "neutral" && "bg-background/60 text-foreground",
                    )}
                  >
                    {insight.text}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <TradeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSave}
        editTrade={trade}
      />

      <TradeReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        trade={trade}
        review={review}
        onSave={handleSaveReview}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any linked trade review will be preserved in Reviews as journal history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
