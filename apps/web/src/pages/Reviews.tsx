import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { BookOpenText, Ellipsis, Eye, Pencil, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard } from "@/components/PageShell";
import { PaginationControls } from "@/components/PaginationControls";
import { ReviewContent } from "@/components/ReviewContent";
import { ReviewListSummary } from "@/components/ReviewListSummary";
import { TradeReviewDialog } from "@/components/TradeReviewDialog";
import { ReviewsSkeleton } from "@/components/skeletons/ReviewsSkeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { createReview, deleteReview, listReviews, updateReview } from "@/lib/api/reviews";
import { getTrade } from "@/lib/api/trades";
import { getPageErrorState } from "@/lib/page-errors";
import { withMinimumDelay } from "@/lib/loading";
import { privateQueryKey } from "@/lib/react-query";
import { getReviewScope, getReviewTitle } from "@/lib/reviews";
import {
  REVIEW_EMOTIONS,
  REVIEW_RISK_STATUSES,
  REVIEW_RULE_STATUSES,
  type Review,
  type ReviewEmotion,
  type ReviewRiskStatus,
  type ReviewRuleStatus,
  type ReviewTradeSnapshot,
  type ReviewType,
  type Trade,
} from "@/lib/types";

type ReviewScopeFilter = "all" | ReviewType;

const emptyDailyForm = {
  reviewDate: new Date().toISOString().split("T")[0],
  wentWell: "",
  mistakes: "",
  followedRules: "Yes" as ReviewRuleStatus,
  emotion: "Calm" as ReviewEmotion,
  lessonLearned: "",
  improvementPlan: "",
  disciplineScore: "3",
};

const emptyWeeklyForm = {
  weekStart: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  weekEnd: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  weeklySummary: "",
  biggestWin: "",
  biggestMistake: "",
  riskManagement: "Yes" as ReviewRiskStatus,
  nextGoal: "",
  weeklyRating: "7",
};
const REVIEWS_PAGE_SIZE = 10;
const EMPTY_REVIEWS: Review[] = [];

function invalidateReviewQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "reviews") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
  ]);
}

function buildTradeFromSnapshot(snapshot: ReviewTradeSnapshot | null): Trade | null {
  if (!snapshot) {
    return null;
  }

  return {
    id: snapshot.id,
    date: snapshot.date,
    pair: snapshot.pair,
    accountId: "",
    direction: snapshot.direction,
    entry: snapshot.entry,
    stopLoss: snapshot.stopLoss,
    takeProfit: snapshot.takeProfit,
    profit: snapshot.profit,
    result: snapshot.result,
    setupId: null,
    setup: snapshot.setup,
    setupColor: snapshot.setupColor ?? null,
    session: snapshot.session,
    emotion: snapshot.emotion,
    notes: snapshot.notes,
    screenshots: snapshot.screenshots,
    createdAt: "",
    updatedAt: "",
    screenshotAssets: [],
  };
}

function formatDailyWeeklyRatio(daily: number, weekly: number) {
  if (daily === 0 && weekly === 0) {
    return "0:0";
  }

  return `${daily}:${weekly}`;
}

function InsightSegment({
  value,
  icon: Icon,
}: {
  value: string;
  icon: typeof BookOpenText;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/75 text-muted-foreground dark:bg-white/[0.03]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

type ReviewSection = {
  key: string;
  title: string;
  reviews: Review[];
};

export default function Reviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scopeFilter, setScopeFilter] = useState<ReviewScopeFilter>("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [open, setOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<Exclude<ReviewType, "trade">>("daily");
  const [dailyForm, setDailyForm] = useState(emptyDailyForm);
  const [weeklyForm, setWeeklyForm] = useState(emptyWeeklyForm);
  const [tradeReviewTrade, setTradeReviewTrade] = useState<Trade | null>(null);
  const [tradeReviewEditing, setTradeReviewEditing] = useState<Review | null>(null);

  const reviewsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "reviews", "list", {
      page,
      pageSize: REVIEWS_PAGE_SIZE,
      type: scopeFilter,
      sortBy,
      sortOrder,
    }),
    queryFn: async () => withMinimumDelay(() => listReviews({
      page,
      pageSize: REVIEWS_PAGE_SIZE,
      type: scopeFilter === "all" ? undefined : scopeFilter,
      sortBy,
      sortOrder,
    })),
    placeholderData: keepPreviousData,
  });

  const visibleReviews = reviewsQuery.data?.items;
  const reviews = visibleReviews ?? EMPTY_REVIEWS;
  const totalReviewPages = reviewsQuery.data?.pagination.totalPages ?? 1;
  const totalReviews = reviewsQuery.data?.pagination.total ?? 0;

  const linkedTradeQueries = useQueries({
    queries: (visibleReviews ?? [])
      .filter((review) => (review.reviewScope || review.type) === "trade" && review.tradeId)
      .map((review) => ({
        queryKey: privateQueryKey(user.id, "trades", "detail", review.tradeId, "review-page"),
        queryFn: async () => {
          const response = await getTrade(review.tradeId as string);
          return response.trade;
        },
      })),
  });

  const linkedTradeMap = useMemo(() => {
    let queryIndex = 0;

    return Object.fromEntries(
      (visibleReviews ?? [])
        .filter((review) => (review.reviewScope || review.type) === "trade" && review.tradeId)
        .map((review) => {
          const trade = linkedTradeQueries[queryIndex]?.data ?? null;
          queryIndex += 1;
          return [review.tradeId as string, trade];
        }),
    );
  }, [linkedTradeQueries, visibleReviews]);

  const viewingTrade = useMemo(() => {
    if (!viewingReview || getReviewScope(viewingReview) !== "trade") {
      return null;
    }

    const linkedTrade = viewingReview.tradeId ? linkedTradeMap[viewingReview.tradeId] : null;
    return linkedTrade ?? buildTradeFromSnapshot(viewingReview.tradeSnapshot);
  }, [linkedTradeMap, viewingReview]);

  useEffect(() => {
    setPage(1);
  }, [scopeFilter, sortBy, sortOrder]);

  const dailyWeeklyMutation = useMutation({
    mutationFn: async () => {
      if (reviewType === "daily") {
        const payload = {
          type: "daily" as const,
          reviewDate: dailyForm.reviewDate,
          wentWell: dailyForm.wentWell.trim() || null,
          mistakes: dailyForm.mistakes.trim() || null,
          followedRules: dailyForm.followedRules,
          emotion: dailyForm.emotion,
          lessonLearned: dailyForm.lessonLearned.trim() || null,
          improvementPlan: dailyForm.improvementPlan.trim() || null,
          disciplineScore: Number(dailyForm.disciplineScore),
        };

        if (editingReview) {
          return updateReview(editingReview.id, payload);
        }

        return createReview(payload);
      }

      const payload = {
        type: "weekly" as const,
        weekStart: weeklyForm.weekStart,
        weekEnd: weeklyForm.weekEnd,
        weeklySummary: weeklyForm.weeklySummary.trim() || null,
        biggestWin: weeklyForm.biggestWin.trim() || null,
        biggestMistake: weeklyForm.biggestMistake.trim() || null,
        riskManagement: weeklyForm.riskManagement,
        nextGoal: weeklyForm.nextGoal.trim() || null,
        weeklyRating: Number(weeklyForm.weeklyRating),
      };

      if (editingReview) {
        return updateReview(editingReview.id, payload);
      }

      return createReview(payload);
    },
    onSuccess: async () => {
      await invalidateReviewQueries(queryClient, user.id);
      toast.success(editingReview ? "Review updated." : "Review created.");
      setOpen(false);
      setEditingReview(null);
      setDailyForm(emptyDailyForm);
      setWeeklyForm(emptyWeeklyForm);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the review right now.";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => deleteReview(reviewId),
    onSuccess: async () => {
      await invalidateReviewQueries(queryClient, user.id);
      toast.success("Review deleted.");
      setDeleteId(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the review right now.";
      toast.error(message);
    },
  });

  const tradeReviewMutation = useMutation({
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

      if (tradeReviewEditing) {
        return updateReview(tradeReviewEditing.id, payload);
      }

      return createReview(payload);
    },
    onSuccess: async () => {
      await invalidateReviewQueries(queryClient, user.id);
      toast.success(tradeReviewEditing ? "Trade review updated." : "Trade review created.");
      setTradeReviewTrade(null);
      setTradeReviewEditing(null);
    },
  });

  const openCreateModal = (type: Exclude<ReviewType, "trade">) => {
    setReviewType(type);
    setEditingReview(null);
    setDailyForm(emptyDailyForm);
    setWeeklyForm(emptyWeeklyForm);
    setOpen(true);
  };

  const openEditModal = async (review: Review) => {
    if ((review.reviewScope || review.type) === "trade") {
      const linkedTrade = review.tradeId ? linkedTradeMap[review.tradeId] : undefined;

      if (linkedTrade) {
        setTradeReviewTrade(linkedTrade);
        setTradeReviewEditing(review);
        return;
      }

      if (review.tradeId) {
        try {
          const response = await getTrade(review.tradeId);
          setTradeReviewTrade(response.trade);
          setTradeReviewEditing(review);
          return;
        } catch {
          toast.error("Linked trade not found. This review can still be viewed.");
          return;
        }
      }
    }

    setEditingReview(review);
    setReviewType((review.reviewScope || review.type) as Exclude<ReviewType, "trade">);

    if ((review.reviewScope || review.type) === "daily") {
      setDailyForm({
        reviewDate: review.reviewDate || emptyDailyForm.reviewDate,
        wentWell: review.wentWell || "",
        mistakes: review.mistakes || "",
        followedRules: review.followedRules || "Yes",
        emotion: review.emotion || "Calm",
        lessonLearned: review.lessonLearned || "",
        improvementPlan: review.improvementPlan || "",
        disciplineScore: String(review.disciplineScore || 3),
      });
    } else {
      setWeeklyForm({
        weekStart: review.weekStart || emptyWeeklyForm.weekStart,
        weekEnd: review.weekEnd || emptyWeeklyForm.weekEnd,
        weeklySummary: review.weeklySummary || "",
        biggestWin: review.biggestWin || "",
        biggestMistake: review.biggestMistake || "",
        riskManagement: review.riskManagement || "Yes",
        nextGoal: review.nextGoal || "",
        weeklyRating: String(review.weeklyRating || 7),
      });
    }

    setOpen(true);
  };

  const reviewMix = useMemo(() => {
    return reviews.reduce(
      (acc, review) => {
        const scope = getReviewScope(review);
        acc[scope] += 1;
        return acc;
      },
      { daily: 0, weekly: 0, trade: 0 } as Record<ReviewType, number>,
    );
  }, [reviews]);

  const reviewSections = useMemo<ReviewSection[]>(() => {
    if (scopeFilter === "trade") {
      return [{
        key: "trade",
        title: "Trade Reviews",
        reviews,
      }];
    }

    if (scopeFilter === "daily") {
      return [{
        key: "daily",
        title: "Daily Reviews",
        reviews,
      }];
    }

    if (scopeFilter === "weekly") {
      return [{
        key: "weekly",
        title: "Weekly Reviews",
        reviews,
      }];
    }

    const reflectiveReviews = reviews.filter((review) => {
      const scope = getReviewScope(review);
      return scope === "daily" || scope === "weekly";
    });
    const tradeReviews = reviews.filter((review) => getReviewScope(review) === "trade");

    return [
      reflectiveReviews.length > 0 ? {
        key: "reflective",
        title: "Daily & Weekly Reviews",
        reviews: reflectiveReviews,
      } : null,
      tradeReviews.length > 0 ? {
        key: "trade",
        title: "Trade Reviews",
        reviews: tradeReviews,
      } : null,
    ].filter((section): section is ReviewSection => Boolean(section));
  }, [reviews, scopeFilter]);

  if (reviewsQuery.isLoading && !reviewsQuery.data) {
    return <ReviewsSkeleton />;
  }

  if (reviewsQuery.isError) {
    const errorState = getPageErrorState(reviewsQuery.error, {
      unavailableTitle: "Reviews unavailable",
      unavailableDescription: "The reviews service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session is not allowed to view reviews right now.",
      validationTitle: "Reviews request invalid",
      validationDescription: "The review filters in this request are invalid.",
      timeoutTitle: "Reviews request timed out",
      timeoutDescription: "Loading reviews took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        onRetry={errorState.allowRetry ? () => void reviewsQuery.refetch() : undefined}
        isRetrying={reviewsQuery.isFetching}
      />
    );
  }

  return (
    <PageShell size="wide">
      <PageHeader title="Reviews" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <SectionCard className="overflow-hidden p-0">
          <div className="grid divide-y divide-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <InsightSegment value={String(totalReviews)} icon={BookOpenText} />
            <InsightSegment value={formatDailyWeeklyRatio(reviewMix.daily, reviewMix.weekly)} icon={Sparkles} />
            <InsightSegment value={String(reviewMix.trade)} icon={Target} />
          </div>
        </SectionCard>

        <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
          <Button variant="outline" className="rounded-2xl px-4" onClick={() => openCreateModal("daily")}>
            <Plus className="h-4 w-4" />
            Daily Review
          </Button>
          <Button className="rounded-2xl px-4" onClick={() => openCreateModal("weekly")}>
            <Plus className="h-4 w-4" />
            Weekly Review
          </Button>
        </div>
      </div>

      <Tabs value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ReviewScopeFilter)}>
        <SectionCard className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-2xl bg-muted/65 p-1 sm:max-w-[420px] dark:bg-white/[0.03]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="trade">Trade</TabsTrigger>
            </TabsList>

            <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updatedAt">Updated</SelectItem>
                        <SelectItem value="createdAt">Created</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest</SelectItem>
                        <SelectItem value="asc">Oldest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
          </div>
        </SectionCard>

        <TabsContent value={scopeFilter} className="space-y-6">
          {reviews.length === 0 ? (
            <EmptyState
              icon={BookOpenText}
              title="No reviews yet"
              description="Create a review to populate this view."
            />
          ) : (
            <div className="space-y-6">
              {reviewSections.map((section) => (
                <section key={section.key} className="space-y-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">{section.title}</p>

                  <div className="grid gap-5 lg:grid-cols-2">
                    {section.reviews.map((review) => {
                      const scope = getReviewScope(review);
                      const linkedTrade = review.tradeId ? linkedTradeMap[review.tradeId] : undefined;
                      const snapshotTrade = buildTradeFromSnapshot(review.tradeSnapshot);
                      const summaryTrade = linkedTrade ?? snapshotTrade;
                      const updatedLabel = new Date(review.updatedAt).toLocaleDateString("en-US");
                      const openReview = () => setViewingReview(review);
                      const isTradeReview = scope === "trade";

                      return (
                        <article
                          key={review.id}
                          role="button"
                          tabIndex={0}
                          className="group h-full rounded-[1.6rem] border border-border/50 bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--card)/0.95))] p-4 text-left shadow-[0_14px_38px_-30px_rgba(15,23,42,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-[0_20px_48px_-30px_rgba(15,23,42,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--card)/0.92))]"
                          onClick={openReview}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openReview();
                            }
                          }}
                        >
                          <div className="flex h-full flex-col gap-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1">
                                {!isTradeReview ? (
                                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                    {getReviewTitle(review, summaryTrade)}
                                  </h2>
                                ) : null}
                                {!isTradeReview ? <p className="text-sm text-muted-foreground">{updatedLabel}</p> : null}
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 rounded-xl px-3.5"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (isTradeReview && review.tradeId) {
                                      navigate(`/trades/${review.tradeId}`);
                                      return;
                                    }

                                    openReview();
                                  }}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl"
                                  aria-label="Edit"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void openEditModal(review);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <Ellipsis className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    {isTradeReview ? (
                                      <DropdownMenuItem
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openReview();
                                        }}
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Review
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setDeleteId(review.id);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <ReviewListSummary review={review} linkedTrade={summaryTrade} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}

              <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/70">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalReviewPages}
                  itemLabel="review pages"
                  onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                  onNext={() => setPage((current) => Math.min(totalReviewPages, current + 1))}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto rounded-[1.75rem]">
          <DialogHeader>
            <DialogTitle>{editingReview ? "Edit Review" : reviewType === "daily" ? "Create Daily Review" : "Create Weekly Review"}</DialogTitle>
          </DialogHeader>

          {reviewType === "daily" ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-label">Review Date</Label>
                <Input type="date" value={dailyForm.reviewDate} onChange={(event) => setDailyForm((current) => ({ ...current, reviewDate: event.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-label">Followed Rules</Label>
                  <Select value={dailyForm.followedRules} onValueChange={(value) => setDailyForm((current) => ({ ...current, followedRules: value as ReviewRuleStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REVIEW_RULE_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-label">Emotion</Label>
                  <Select value={dailyForm.emotion} onValueChange={(value) => setDailyForm((current) => ({ ...current, emotion: value as ReviewEmotion }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REVIEW_EMOTIONS.map((emotion) => <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-label">Discipline Score</Label>
                  <Input value={dailyForm.disciplineScore} onChange={(event) => setDailyForm((current) => ({ ...current, disciplineScore: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-label">What Went Well</Label>
                <Textarea rows={4} value={dailyForm.wentWell} onChange={(event) => setDailyForm((current) => ({ ...current, wentWell: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-label">Mistakes</Label>
                <Textarea rows={4} value={dailyForm.mistakes} onChange={(event) => setDailyForm((current) => ({ ...current, mistakes: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-label">Lesson Learned</Label>
                <Textarea rows={4} value={dailyForm.lessonLearned} onChange={(event) => setDailyForm((current) => ({ ...current, lessonLearned: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-label">Improvement Plan</Label>
                <Textarea rows={4} value={dailyForm.improvementPlan} onChange={(event) => setDailyForm((current) => ({ ...current, improvementPlan: event.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-label">Week Start</Label>
                  <Input type="date" value={weeklyForm.weekStart} onChange={(event) => setWeeklyForm((current) => ({ ...current, weekStart: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-label">Week End</Label>
                  <Input type="date" value={weeklyForm.weekEnd} onChange={(event) => setWeeklyForm((current) => ({ ...current, weekEnd: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-label">Risk Management</Label>
                  <Select value={weeklyForm.riskManagement} onValueChange={(value) => setWeeklyForm((current) => ({ ...current, riskManagement: value as ReviewRiskStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REVIEW_RISK_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-label">Weekly Rating</Label>
                  <Input value={weeklyForm.weeklyRating} onChange={(event) => setWeeklyForm((current) => ({ ...current, weeklyRating: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-label">Weekly Summary</Label>
                <Textarea rows={4} value={weeklyForm.weeklySummary} onChange={(event) => setWeeklyForm((current) => ({ ...current, weeklySummary: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-label">Biggest Win</Label>
                <Textarea rows={4} value={weeklyForm.biggestWin} onChange={(event) => setWeeklyForm((current) => ({ ...current, biggestWin: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-label">Biggest Mistake</Label>
                <Textarea rows={4} value={weeklyForm.biggestMistake} onChange={(event) => setWeeklyForm((current) => ({ ...current, biggestMistake: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-label">Next Goal</Label>
                <Textarea rows={4} value={weeklyForm.nextGoal} onChange={(event) => setWeeklyForm((current) => ({ ...current, nextGoal: event.target.value }))} />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => dailyWeeklyMutation.mutate()} disabled={dailyWeeklyMutation.isPending}>
              {dailyWeeklyMutation.isPending ? "Saving..." : editingReview ? "Save Changes" : "Save Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingReview)} onOpenChange={(openState) => !openState && setViewingReview(null)}>
        <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto rounded-[1.75rem]">
          <DialogHeader>
            <DialogTitle>{viewingReview ? getReviewTitle(viewingReview, viewingTrade) : "Review Details"}</DialogTitle>
          </DialogHeader>
          {viewingReview ? <ReviewContent review={viewingReview} linkedTrade={viewingTrade} /> : null}
        </DialogContent>
      </Dialog>

      {tradeReviewTrade ? (
        <TradeReviewDialog
          open={Boolean(tradeReviewTrade)}
          onOpenChange={(openState) => {
            if (!openState) {
              setTradeReviewTrade(null);
              setTradeReviewEditing(null);
            }
          }}
          trade={tradeReviewTrade}
          review={tradeReviewEditing}
          onSave={async (review) => {
            await tradeReviewMutation.mutateAsync(review);
          }}
          isSaving={tradeReviewMutation.isPending}
        />
      ) : null}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(openState) => !openState && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
