import { useEffect, useMemo, useState } from "react";
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
import { PageShell } from "@/layouts/PageShell";
import { ProfitDisplay } from "@/features/trades/components/ProfitDisplay";
import { ResultBadge } from "@/features/trades/components/ResultBadge";
import { SetupTag } from "@/components/SetupTag";
import { ShareTradeModal } from "@/features/trade-sharing/components/ShareTradeModal";
import { TradeChecklistResults } from "@/features/checklist/components/TradeChecklistResults";
import { TradeReviewContent } from "@/features/reviews/components/TradeReviewContent";
import { TradeReviewDialog } from "@/features/reviews/components/TradeReviewDialog";
import { TradeReviewStatusBadge } from "@/features/reviews/components/TradeReviewStatusBadge";
import { TagChip } from "@/components/ui/TagChip";
import { listAccounts } from "@/services/api/accounts";
import { ApiError } from "@/services/api/client";
import { createReview, listReviews, updateReview } from "@/services/api/reviews";
import { readTradeScreenshotClipboardFiles, uploadTradeScreenshot } from "@/services/api/screenshots";
import { deleteTrade, getTrade } from "@/services/api/trades";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import { privateQueryKey, removeTradeQueryData, syncTradeScreenshotQueryData, updateTradeQueryData } from "@/services/query-client";
import type { Review, Trade } from "@/types";
import { cn } from "@/utils/class-names";

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
  onPasteScreenshots,
  onPasteButtonClick,
  pasteEnabled,
  isUploading,
}: {
  trade: Trade;
  onAddScreenshot: () => void;
  onPasteScreenshots: (files: File[]) => Promise<void>;
  onPasteButtonClick: () => Promise<void>;
  pasteEnabled: boolean;
  isUploading: boolean;
}) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const screenshots = trade.screenshotAssets ?? [];

  useEffect(() => {
    if (!pasteEnabled) {
      return;
    }

    const handleWindowPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      void onPasteScreenshots(files);
    };

    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [onPasteScreenshots, pasteEnabled]);

  return (
    <>
      <SectionCard
        title="Screenshots"
        description={isUploading ? "Uploading..." : undefined}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => void onPasteButtonClick()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Paste Screenshot"}
            </Button>
            <Button variant="outline" size="sm" onClick={onAddScreenshot} disabled={isUploading}>
              <ImagePlus className="mr-1 h-4 w-4" />
              Manage
            </Button>
          </div>
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
            <h3 className="mt-4 text-base font-medium text-foreground">No screenshots</h3>
            <Button className="mt-4" variant="outline" size="sm" onClick={onAddScreenshot}>
              <Camera className="mr-1 h-4 w-4" />
              Add screenshot
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
    insights.push({ tone: "warn", text: "Strong result, weak discipline." });
  } else if (trade.profit > 0 && trade.emotion === "Frustrated") {
    insights.push({ tone: "warn", text: "Winning trade, frustrated state." });
  } else if (review?.lessonLearned) {
    insights.push({ tone: "good", text: "Clear lesson captured." });
  }

  if (!(trade.screenshotAssets?.length ?? 0)) {
    insights.push({ tone: "warn", text: "No screenshot saved." });
  }

  if (!review) {
    insights.push({ tone: "neutral", text: "Review still open." });
  }

  if (trade.session) {
    insights.push({ tone: "neutral", text: `${trade.session} session captured.` });
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [isReadingScreenshotClipboard, setIsReadingScreenshotClipboard] = useState(false);

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
    queryKey: privateQueryKey(user.id, "accounts", "active"),
    queryFn: async () => {
      const response = await listAccounts({ status: "active" });
      return response.items;
    },
  });
  const deleteTradeMutation = useMutation({
    mutationFn: async () => deleteTrade(id),
    onSuccess: async () => {
      removeTradeQueryData(queryClient, user.id, id);
      await invalidateTradeQueries(queryClient, user.id, id);
      toast.success("Trade deleted.");
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
  const isProcessingScreenshotClipboard = isUploadingScreenshot || isReadingScreenshotClipboard;
  const editTradePath = `/trades/${id}/edit`;

  const handlePasteScreenshots = async (files: File[]) => {
    if (!trade || isProcessingScreenshotClipboard) {
      return;
    }

    setIsUploadingScreenshot(true);

    try {
      let nextTrade = trade;

      for (const file of files) {
        const screenshot = await uploadTradeScreenshot({
          tradeId: nextTrade.id,
          file,
          sortOrder: nextTrade.screenshotAssets?.length ?? 0,
        });

        const nextScreenshots = [...(nextTrade.screenshotAssets ?? []), screenshot];
        nextTrade = {
          ...nextTrade,
          screenshotAssets: nextScreenshots,
          screenshots: nextScreenshots.map((item) => item.url),
        };

        updateTradeQueryData(queryClient, user.id, nextTrade);
      }

      await syncTradeScreenshotQueryData(queryClient, user.id, nextTrade);
      toast.success(files.length === 1 ? "Screenshot uploaded." : "Screenshots uploaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Screenshot upload failed.";
      toast.error(message);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handlePasteScreenshotsFromClipboard = async () => {
    if (isProcessingScreenshotClipboard) {
      return;
    }

    setIsReadingScreenshotClipboard(true);

    try {
      const files = await readTradeScreenshotClipboardFiles();
      await handlePasteScreenshots(files);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read an image from your clipboard.";
      toast.error(message);
    } finally {
      setIsReadingScreenshotClipboard(false);
    }
  };

  useUnauthorizedSessionGuard(tradeQuery.error, reviewQuery.error, accountsQuery.error);

  if (isTradeLoading) {
    return <TradeDetailSkeleton />;
  }

  if (tradeError) {
    const errorState = getPageErrorState(tradeError, {
      unavailableTitle: "Trade unavailable",
      unavailableDescription: "This trade could not be loaded right now. Please try again in a moment.",
      unauthorizedTitle: "Trade access denied",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
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
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([
            tradeQuery.refetch(),
            reviewQuery.refetch(),
            accountsQuery.refetch(),
          ]);
        } : undefined}
        isRetrying={tradeQuery.isFetching || reviewQuery.isFetching || accountsQuery.isFetching}
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
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {formatTradeDate(trade.date)}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className={cn("inline-flex items-center gap-2", review ? "text-success" : "text-muted-foreground")}>
                      <CheckCircle2 className="h-4 w-4" />
                      {review ? `Reviewed ${reviewUpdatedLabel || ""}` : "Review open"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 xl:max-w-[420px] xl:items-end">
              <div className="surface-muted w-full p-4 xl:max-w-[360px]">
                <p className="text-label mb-2">PnL</p>
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
                <Button variant="outline" size="sm" className="w-full xl:w-auto" onClick={() => navigate(editTradePath)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="w-full xl:w-auto" onClick={() => setReviewOpen(true)}>
                  <Sparkles className="mr-1 h-4 w-4" />
                  {review ? "Edit review" : "Review"}
                </Button>
                <Button variant="outline" size="sm" className="w-full xl:w-auto" onClick={() => setShareOpen(true)}>
                  <Share2 className="mr-1 h-4 w-4" />
                  Share
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
            <SectionCard title="Overview">
              <div className="grid gap-4 md:grid-cols-2">
                <MetricTile label="Account" value={accountName} />
                <MetricTile label="Direction" value={trade.direction} />
                <MetricTile label="Session" value={trade.session || "Not set"} />
                <MetricTile label="Emotion" value={trade.emotion || "Not set"} />
              </div>
            </SectionCard>

            <SectionCard title="Execution">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricTile label="Entry" value={<span className="font-mono-price">{trade.entry}</span>} />
                  <MetricTile label="Stop Loss" value={<span className="font-mono-price">{trade.stopLoss}</span>} />
                  <MetricTile label="Take Profit" value={<span className="font-mono-price">{trade.takeProfit}</span>} />
                  <MetricTile label="Risk : Reward" value={rrValue ? `1:${rrValue.toFixed(2)}` : "—"} valueClassName="font-mono-price" />
                </div>

                <div className="surface-muted p-4">
                  <p className="text-label mb-3">Summary</p>
                  <div className="mt-3 space-y-1">
                    <InsightRow label="Result" value={<ResultBadge result={trade.result} />} />
                    <InsightRow label="Setup" value={trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : "No setup tagged"} />
                    <InsightRow label="Screenshots" value={`${trade.screenshotAssets?.length ?? 0}`} />
                    <InsightRow label="Review" value={review ? "Done" : "Open"} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Review"
              action={<Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>{review ? "Edit review" : "Review"}</Button>}
            >
              {review ? (
                <div className="space-y-4">
                  <div className="surface-muted flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Reviewed</p>
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
                  <h3 className="mt-4 text-base font-medium text-foreground">No review</h3>
                  <Button className="mt-4" onClick={() => setReviewOpen(true)}>
                    Review
                  </Button>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <ScreenshotGalleryCard
              trade={trade}
              onAddScreenshot={() => navigate(editTradePath)}
              onPasteScreenshots={handlePasteScreenshots}
              onPasteButtonClick={handlePasteScreenshotsFromClipboard}
              pasteEnabled
              isUploading={isProcessingScreenshotClipboard}
            />

            <SectionCard title="Checklist">
              <TradeChecklistResults responses={trade.checklistResponses ?? []} />
            </SectionCard>

            <SectionCard title="Notes">
              {trade.notes ? (
                <div className="surface-muted p-4">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{trade.notes}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                  No notes.
                </div>
              )}
            </SectionCard>

            <SectionCard title="Insights">
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
              {`Delete ${trade.pair} from ${formatTradeDate(trade.date)}? This permanently removes the trade from your journal. Linked reviews stay in Reviews so your notes are preserved.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTradeMutation.mutate()}
              disabled={deleteTradeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTradeMutation.isPending ? "Deleting..." : "Delete Trade"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
