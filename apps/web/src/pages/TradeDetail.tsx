import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, Clock3, ImagePlus, Pencil, Share2, Sparkles, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PageErrorState } from "@/components/PageErrorState";
import { TradeDetailSkeleton } from "@/components/skeletons/TradeDetailSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { PageShell } from "@/components/PageShell";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { ShareTradeModal } from "@/components/ShareTradeModal";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { TradeReviewContent } from "@/components/TradeReviewContent";
import { TradeReviewDialog } from "@/components/TradeReviewDialog";
import { TradeReviewStatusBadge } from "@/components/TradeReviewStatusBadge";
import { TagChip } from "@/components/ui/TagChip";
import { listAccounts } from "@/lib/api/accounts";
import { ApiError } from "@/lib/api/client";
import { createReview, listReviews, updateReview } from "@/lib/api/reviews";
import { listSetups } from "@/lib/api/setups";
import { deleteTrade, getTrade, updateTrade } from "@/lib/api/trades";
import { useAuth } from "@/lib/auth";
import { withMinimumDelay } from "@/lib/loading";
import { getPageErrorState } from "@/lib/page-errors";
import { privateQueryKey, removeTradeQueryData, syncTradeScreenshotQueryData, updateTradeQueryData } from "@/lib/react-query";
import type { Review, Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    <section className={cn("surface p-4", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
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
    <div className="surface-muted p-4">
      <p className="text-label mb-2">{label}</p>
      <div className={cn("text-sm font-medium text-foreground", valueClassName)}>{value}</div>
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
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
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
  const screenshots = trade.screenshotAssets ?? [];

  return (
    <>
      <SectionCard
        title="Screenshot Gallery"
        description="Execution charts, post-trade markup, and context images for future review."
        action={
          <Button variant="outline" size="sm" onClick={onAddScreenshot}>
            <ImagePlus className="mr-1 h-4 w-4" />
            Manage Screenshots
          </Button>
        }
      >
        {screenshots.length > 0 ? (
          <div className="space-y-3">
            <button type="button" onClick={() => setPreviewSrc(screenshots[0].url)} className="group block w-full overflow-hidden rounded-2xl border bg-muted/20 text-left">
              <img src={screenshots[0].url} alt={`${trade.pair} screenshot 1`} className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            </button>

            {screenshots.length > 1 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {screenshots.slice(1).map((screenshot, index) => (
                  <button key={screenshot.id} type="button" onClick={() => setPreviewSrc(screenshot.url)} className="overflow-hidden rounded-xl border bg-muted/20">
                    <img src={screenshot.url} alt={`${trade.pair} screenshot ${index + 2}`} className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
              <CameraOff className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-medium text-foreground">No screenshots added</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add charts or execution images to improve future review.
            </p>
            <Button className="mt-4" variant="outline" size="sm" onClick={onAddScreenshot}>
              <Camera className="mr-1 h-4 w-4" />
              Add Screenshot
            </Button>
          </div>
        )}
      </SectionCard>

      <Dialog open={Boolean(previewSrc)} onOpenChange={(open) => !open && setPreviewSrc(null)}>
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

function buildInsights({ trade, review }: { trade: Trade; review?: Review | null }) {
  const insights: Array<{ tone: "neutral" | "good" | "warn"; text: string }> = [];

  if (trade.profit > 0 && review && (review.disciplineScore || 0) <= 2) {
    insights.push({ tone: "warn", text: "Strong result, but discipline score is still low." });
  } else if (trade.profit > 0 && trade.emotion === "Frustrated") {
    insights.push({ tone: "warn", text: "Winning trade with a frustrated emotional state." });
  } else if (review?.lessonLearned) {
    insights.push({ tone: "good", text: "Reviewed trade with a clear lesson captured." });
  }

  if (!(trade.screenshotAssets?.length ?? 0)) {
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

function invalidateTradeQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string, tradeId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "reviews") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "dashboard-summary") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-breakdowns") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-calendar") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "setups") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades", "detail", tradeId) }),
  ]);
}

export default function TradeDetail() {
  const { user } = useAuth();
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const tradeQuery = useQuery({
    queryKey: privateQueryKey(user.id, "trades", "detail", id),
    queryFn: async () => {
      const response = await withMinimumDelay(() => getTrade(id));
      return response.trade;
    },
    enabled: Boolean(id),
  });
  const reviewQuery = useQuery({
    queryKey: privateQueryKey(user.id, "reviews", "trade", id),
    queryFn: async () => {
      const response = await listReviews({ type: "trade", tradeId: id, page: 1, pageSize: 10 });
      return response.items[0] ?? null;
    },
    enabled: Boolean(id),
  });
  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts"),
    queryFn: async () => {
      const response = await listAccounts();
      return response.items;
    },
  });
  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "options"),
    queryFn: async () => {
      const response = await listSetups({ page: 1, pageSize: 100, status: "all", sortBy: "name", sortOrder: "asc" });
      return response.items;
    },
  });

  const updateTradeMutation = useMutation({
    mutationFn: async (payload: Parameters<NonNullable<React.ComponentProps<typeof TradeFormDialog>["onSave"]>>[0]) => updateTrade(id, payload),
    onSuccess: async (result) => {
      updateTradeQueryData(queryClient, user.id, result.trade);
      await invalidateTradeQueries(queryClient, user.id, id);
      toast.success("Trade updated successfully.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the trade right now.";
      toast.error(message);
    },
  });
  const deleteTradeMutation = useMutation({
    mutationFn: async () => deleteTrade(id),
    onSuccess: async () => {
      removeTradeQueryData(queryClient, user.id, id);
      await invalidateTradeQueries(queryClient, user.id, id);
      navigate("/trades");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the trade right now.";
      toast.error(message);
    },
  });
  const saveReviewMutation = useMutation({
    mutationFn: async (review: Review) => {
      const payload = {
        type: "trade" as const,
        tradeId: review.tradeId!,
        reviewDate: review.reviewDate ?? null,
        lessonLearned: review.lessonLearned ?? null,
        disciplineScore: review.disciplineScore ?? null,
        executionRating: review.executionRating ?? null,
        emotionRating: review.emotionRating ?? null,
        whatWentWell: review.whatWentWell ?? null,
        whatWentWrong: review.whatWentWrong ?? null,
        mistakesMade: review.mistakesMade ?? null,
        improvementForNextTrade: review.improvementForNextTrade ?? null,
        wouldTakeAgain: review.wouldTakeAgain ?? null,
      };

      if (reviewQuery.data?.id) {
        return updateReview(reviewQuery.data.id, payload);
      }

      return createReview(payload);
    },
    onSuccess: async () => {
      await invalidateTradeQueries(queryClient, user.id, id);
      toast.success(reviewQuery.data ? "Trade review updated." : "Trade review created.");
      setReviewOpen(false);
    },
  });

  const trade = tradeQuery.data ?? null;
  const review = reviewQuery.data ?? null;
  const accountName = useMemo(() => {
    if (!trade) {
      return "Unassigned";
    }

    return trade.account?.name ?? accountsQuery.data?.find((account) => account.id === trade.accountId)?.name ?? "Unassigned";
  }, [accountsQuery.data, trade]);
  const risk = trade ? Math.abs(trade.entry - trade.stopLoss) : 0;
  const reward = trade ? Math.abs(trade.takeProfit - trade.entry) : 0;
  const rrValue = risk > 0 ? reward / risk : null;
  const reviewUpdatedLabel = review?.updatedAt ? format(parseISO(review.updatedAt), "MMM d, yyyy • h:mm a") : null;
  const insights = useMemo(() => {
    if (!trade) {
      return [];
    }

    return buildInsights({ trade, review });
  }, [trade, review]);
  const isTradeLoading = tradeQuery.isLoading && !trade;
  const tradeError = tradeQuery.error ?? (!trade ? new ApiError("Trade not found.", 404, "TRADE_NOT_FOUND") : null);

  if (isTradeLoading) {
    return <TradeDetailSkeleton />;
  }

  if (tradeError) {
    const errorState = getPageErrorState(tradeError, {
      unavailableTitle: "Trade unavailable",
      unavailableDescription: "This trade could not be loaded right now. Please try again in a moment.",
      unauthorizedTitle: "Trade access denied",
      unauthorizedDescription: "You are not allowed to view this trade right now.",
      notFoundTitle: "Trade not found",
      notFoundDescription: "This trade does not exist or may have been deleted.",
      validationTitle: "Invalid trade link",
      validationDescription: "This trade link is invalid.",
      timeoutTitle: "Trade request timed out",
      timeoutDescription: "Loading this trade took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([
            tradeQuery.refetch(),
            reviewQuery.refetch(),
            accountsQuery.refetch(),
            setupsQuery.refetch(),
          ]);
        } : undefined}
        isRetrying={tradeQuery.isFetching || reviewQuery.isFetching || accountsQuery.isFetching || setupsQuery.isFetching}
        secondaryAction={{
          label: "Back to Trades",
          onClick: () => navigate("/trades"),
        }}
      />
    );
  }

  return (
    <PageShell size="wide">
      <section className="surface p-4 sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/trades")} className="-ml-2 w-fit">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Trades
              </Button>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-foreground">
                    {trade.pair}
                  </h1>
                  <ResultBadge result={trade.result} />
                  <TradeReviewStatusBadge trade={trade} reviewed={Boolean(review)} />
                  {trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : null}
                  {trade.session ? <TagChip label={trade.session} kind="session" /> : null}
                  {trade.emotion ? <TagChip label={trade.emotion} kind="emotion" /> : null}
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {formatTradeDate(trade.date)}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Trade logged
                    </span>
                    <span className={cn("inline-flex items-center gap-2", review ? "text-success" : "text-muted-foreground")}>
                      <CheckCircle2 className="h-4 w-4" />
                      {review ? `Review completed ${reviewUpdatedLabel || ""}` : "Review pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 xl:max-w-[420px] xl:items-end">
              <div className="surface-muted w-full p-4 xl:max-w-[360px]">
                <p className="text-label mb-2">Net Result</p>
                <ProfitDisplay value={trade.profit} className="block text-2xl font-semibold" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="surface p-3">
                    <p className="text-label mb-2">Direction</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{trade.direction}</p>
                  </div>
                  <div className="surface p-3">
                    <p className="text-label mb-2">Account</p>
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
                <Button variant="outline" size="sm" className="w-full xl:w-auto" onClick={() => setShareOpen(true)}>
                  <Share2 className="mr-1 h-4 w-4" />
                  Share Trade
                </Button>
                <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive xl:w-auto" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <SectionCard title="Trade Overview" description="Core context for this execution, account, and trader state.">
              <div className="grid gap-4 md:grid-cols-2">
                <MetricTile label="Account" value={accountName} />
                <MetricTile label="Direction" value={trade.direction} />
                <MetricTile label="Session" value={trade.session || "Not set"} />
                <MetricTile label="Emotion" value={trade.emotion || "Not set"} />
              </div>
            </SectionCard>

            <SectionCard title="Execution Metrics" description="Price levels, structure, and trade quality inputs.">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricTile label="Entry" value={<span className="font-mono-price">{trade.entry}</span>} />
                  <MetricTile label="Stop Loss" value={<span className="font-mono-price">{trade.stopLoss}</span>} />
                  <MetricTile label="Take Profit" value={<span className="font-mono-price">{trade.takeProfit}</span>} />
                  <MetricTile label="Risk : Reward" value={rrValue ? `1:${rrValue.toFixed(2)}` : "—"} valueClassName="font-mono-price" />
                </div>

                <div className="surface-muted p-4">
                  <p className="text-label mb-3">Performance</p>
                  <div className="mt-3 space-y-1">
                    <InsightRow label="Result" value={<ResultBadge result={trade.result} />} />
                    <InsightRow label="Setup" value={trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : "No setup tagged"} />
                    <InsightRow label="Screenshot Count" value={`${trade.screenshotAssets?.length ?? 0} ${(trade.screenshotAssets?.length ?? 0) === 1 ? "image" : "images"}`} />
                    <InsightRow label="Review Status" value={review ? "Completed" : "Pending"} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Trade Review"
              description="Capture execution quality, discipline, and the lesson while it is still fresh."
              action={<Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>{review ? "Edit Review" : "Write Review"}</Button>}
            >
              {review ? (
                <div className="space-y-4">
                  <div className="surface-muted flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Review completed</p>
                      <p className="mt-1 text-xs text-muted-foreground">{reviewUpdatedLabel || "Recently updated"}</p>
                    </div>
                    <TradeReviewStatusBadge trade={trade} reviewed />
                  </div>
                  <TradeReviewContent review={review} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-medium text-foreground">No review yet</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Capture mistakes, discipline, and lessons while the trade is still fresh.
                  </p>
                  <Button className="mt-4" onClick={() => setReviewOpen(true)}>
                    Write Review
                  </Button>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <ScreenshotGalleryCard trade={trade} onAddScreenshot={() => setEditOpen(true)} />

            <SectionCard title="Journal Notes" description="Execution context, planning notes, or post-trade comments.">
              {trade.notes ? (
                <div className="surface-muted p-4">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{trade.notes}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                  No notes added yet. Add pre-trade context or post-trade observations to deepen the review.
                </div>
              )}
            </SectionCard>

            <SectionCard title="Quick Insights" description="A lightweight summary of what stands out in this trade journal entry.">
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={`${insight.text}-${index}`}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-sm",
                      insight.tone === "good" && "border-success/20 bg-success/10 text-foreground",
                      insight.tone === "warn" && "border-amber-400/20 bg-amber-500/10 text-foreground",
                      insight.tone === "neutral" && "border-border bg-background/60 text-foreground",
                    )}
                  >
                    {insight.text}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      <TradeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={async (payload) => {
          await updateTradeMutation.mutateAsync(payload);
        }}
        editTrade={trade}
        accounts={accountsQuery.data ?? []}
        setups={setupsQuery.data ?? []}
        isSaving={updateTradeMutation.isPending}
        onScreenshotsChange={(updatedTrade) => {
          void syncTradeScreenshotQueryData(queryClient, user.id, updatedTrade);
        }}
      />

      <TradeReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        trade={trade}
        review={review}
        onSave={async (nextReview) => {
          await saveReviewMutation.mutateAsync(nextReview);
        }}
        isSaving={saveReviewMutation.isPending}
      />

      <ShareTradeModal open={shareOpen} onOpenChange={setShareOpen} trade={trade} accountName={accountName} />

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
            <AlertDialogAction onClick={() => deleteTradeMutation.mutate()} disabled={deleteTradeMutation.isPending}>
              {deleteTradeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
