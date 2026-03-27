import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ArrowRight, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard } from "@/layouts/PageShell";
import { ProfitDisplay } from "@/features/trades/components/ProfitDisplay";
import { ReviewContent } from "@/features/reviews/components/ReviewContent";
import { TradeReviewDialog } from "@/features/reviews/components/TradeReviewDialog";
import { ReviewsSkeleton } from "@/components/skeletons/ReviewsSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagChip } from "@/components/ui/TagChip";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { ApiError } from "@/services/api/client";
import { createReview, listReviews, type ListReviewsParams, updateReview } from "@/services/api/reviews";
import { getTrade } from "@/services/api/trades";
import { formatNumberDisplay } from "@/utils/analytics-rendering";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import { privateQueryKey } from "@/services/query-client";
import { getReviewScope, getReviewTitle } from "@/utils/reviews";
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
} from "@/types";
import { cn } from "@/utils/class-names";

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

const EMPTY_REVIEWS: Review[] = [];
const CALENDAR_REVIEW_PAGE_SIZE = 50;
const WEEKLY_REVIEW_PAGE_SIZE = 12;

type CalendarTone = "good" | "warn" | "bad" | "review" | "empty";
type CalendarReviewDay = {
  key: string;
  date: Date;
  dayLabel: string;
  inCurrentMonth: boolean;
  review: Review | null;
  hasTradeReviews: boolean;
  tone: CalendarTone;
  icon: string | null;
};

function invalidateReviewQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "reviews") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
  ]);
}

function buildTradeFromSnapshot(snapshot: ReviewTradeSnapshot | null | undefined): Trade | null {
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

function reviewSortValue(review: Review) {
  const fallback = review.updatedAt || review.createdAt;
  const candidate = review.reviewDate || review.weekEnd || review.weekStart || fallback;
  return new Date(candidate).getTime();
}

function oneLine(value?: string | null, fallback = "Keep reviewing to sharpen the next session.") {
  if (!value) {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;

  if (firstSentence.length <= 110) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 107).trimEnd()}...`;
}

function getDailyTone(review: Review | null): CalendarTone {
  if (!review) {
    return "empty";
  }

  const score = review.disciplineScore ?? 0;

  if (score >= 8 && review.followedRules === "Yes") {
    return "good";
  }

  if (score <= 4 || review.followedRules === "No") {
    return "bad";
  }

  return "warn";
}

function getDailyIcon(review: Review | null) {
  const tone = getDailyTone(review);

  if (tone === "good") {
    return (review?.disciplineScore ?? 0) >= 9 ? "🔥" : "✔";
  }

  if (tone === "bad") {
    return "⚠";
  }

  return null;
}

function getDailyDisciplineLabel(review: Review | null) {
  const score = review?.disciplineScore ?? null;

  if (score == null) {
    return "Not scored";
  }

  if (score >= 8) {
    return "High discipline";
  }

  if (score >= 6) {
    return "Steady discipline";
  }

  if (score >= 4) {
    return "Mixed discipline";
  }

  return "Low discipline";
}

function getDailyInsight(review: Review | null) {
  return oneLine(
    review?.lessonLearned || review?.improvementPlan || review?.mistakes || review?.wentWell,
    "No key insight logged for this day.",
  );
}

function getWeeklyStrength(review: Review | null) {
  return oneLine(review?.biggestWin || review?.weeklySummary, "No strength logged yet.");
}

function getWeeklyImprovement(review: Review | null) {
  return oneLine(review?.nextGoal || review?.biggestMistake, "Add one concrete improvement for next week.");
}

function getWeeklyTrend(current: Review | null, previous: Review | null) {
  if (!current || current.weeklyRating == null || !previous || previous.weeklyRating == null) {
    return {
      label: "No prior trend yet",
      tone: "default" as const,
      value: 0,
    };
  }

  const delta = current.weeklyRating - previous.weeklyRating;

  if (delta > 0) {
    return {
      label: `Up ${delta} vs last week`,
      tone: "success" as const,
      value: delta,
    };
  }

  if (delta < 0) {
    return {
      label: `Down ${Math.abs(delta)} vs last week`,
      tone: "danger" as const,
      value: delta,
    };
  }

  return {
    label: "Flat vs last week",
    tone: "default" as const,
    value: 0,
  };
}

function getTradeReviewTakeaway(review: Review) {
  return oneLine(
    review.whatWentWrong || review.mistakesMade || review.improvementForNextTrade || review.lessonLearned || review.whatWentWell,
    "No takeaway yet.",
  );
}

function getTradeReviewJudgement(review: Review) {
  if ((review.executionRating ?? 0) >= 4 || review.whatWentWell) {
    return "✔ Good execution";
  }

  if ((review.executionRating ?? 5) <= 2 || review.wouldTakeAgain === false) {
    return "⚠ Needs review";
  }

  return "⚠ Mixed execution";
}

function compactSession(value?: string | null) {
  if (value === "New York") {
    return "NY";
  }

  if (value === "London") {
    return "LDN";
  }

  return value ?? "—";
}

function compactTradePrice(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return formatNumberDisplay(value, { maximumFractionDigits: 2 });
}

function getTradeReviewMeta(trade: Trade | null, review: Review) {
  return [
    trade?.emotion || null,
    compactSession(trade?.session),
    review.disciplineScore != null ? `${review.disciplineScore}/5` : null,
  ].filter(Boolean).join(" · ");
}

function buildCalendarDays(currentMonth: Date, reviewMap: Map<string, Review>, tradeReviewDates: Set<string>) {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });

  return eachDayOfInterval({ start, end }).map((date) => {
    const key = format(date, "yyyy-MM-dd");
    const review = reviewMap.get(key) ?? null;
    const hasTradeReviews = tradeReviewDates.has(key);
    const tone = review ? getDailyTone(review) : hasTradeReviews ? "review" : "empty";
    const icon = review ? getDailyIcon(review) : hasTradeReviews ? "✎" : null;

    return {
      key,
      date,
      dayLabel: format(date, "d"),
      inCurrentMonth: isSameMonth(date, currentMonth),
      review,
      hasTradeReviews,
      tone,
      icon,
    } satisfies CalendarReviewDay;
  });
}

function isReviewForDate(review: Review, dateKey: string) {
  const candidate = review.reviewDate || review.tradeSnapshot?.date || null;
  return candidate === dateKey;
}

async function listAllReviewPages(params: ListReviewsParams) {
  const items: Review[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await listReviews({
      ...params,
      page,
    });

    items.push(...response.items);
    hasNextPage = response.pagination.hasNextPage;
    page += 1;
  }

  return items;
}

export default function Reviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [reviewType, setReviewType] = useState<Exclude<ReviewType, "trade">>("daily");
  const [dailyForm, setDailyForm] = useState(emptyDailyForm);
  const [weeklyForm, setWeeklyForm] = useState(emptyWeeklyForm);
  const [tradeReviewTrade, setTradeReviewTrade] = useState<Trade | null>(null);
  const [tradeReviewEditing, setTradeReviewEditing] = useState<Review | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedWeeklyIndex, setSelectedWeeklyIndex] = useState(0);
  const calendarRangeStart = useMemo(
    () => startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    [currentMonth],
  );
  const calendarRangeEnd = useMemo(
    () => endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    [currentMonth],
  );
  const calendarDateFrom = useMemo(() => format(calendarRangeStart, "yyyy-MM-dd"), [calendarRangeStart]);
  const calendarDateTo = useMemo(() => format(calendarRangeEnd, "yyyy-MM-dd"), [calendarRangeEnd]);

  const dailyReviewsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "reviews", "daily-calendar", calendarDateFrom, calendarDateTo),
    queryFn: async () => withMinimumDelay(() => listAllReviewPages({
      type: "daily",
      dateFrom: calendarDateFrom,
      dateTo: calendarDateTo,
      pageSize: CALENDAR_REVIEW_PAGE_SIZE,
      sortBy: "reviewDate",
      sortOrder: "asc",
    })),
  });

  const weeklyReviewsQuery = useInfiniteQuery({
    queryKey: privateQueryKey(user.id, "reviews", "weekly-pages"),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => withMinimumDelay(() => listReviews({
      type: "weekly",
      page: pageParam,
      pageSize: WEEKLY_REVIEW_PAGE_SIZE,
      sortBy: "weekEnd",
      sortOrder: "desc",
    })),
    getNextPageParam: (lastPage) => lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });

  const tradeReviewsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "reviews", "trade-calendar", calendarDateFrom, calendarDateTo),
    queryFn: async () => withMinimumDelay(() => listAllReviewPages({
      type: "trade",
      dateFrom: calendarDateFrom,
      dateTo: calendarDateTo,
      pageSize: CALENDAR_REVIEW_PAGE_SIZE,
      sortBy: "reviewDate",
      sortOrder: "asc",
    })),
  });

  const dailyReviews = dailyReviewsQuery.data ?? EMPTY_REVIEWS;
  const weeklyReviews = useMemo(
    () => weeklyReviewsQuery.data?.pages.flatMap((page) => page.items) ?? EMPTY_REVIEWS,
    [weeklyReviewsQuery.data],
  );
  const tradeReviews = tradeReviewsQuery.data ?? EMPTY_REVIEWS;

  const viewingTrade = useMemo(() => {
    if (!viewingReview || getReviewScope(viewingReview) !== "trade") {
      return null;
    }

    return buildTradeFromSnapshot(viewingReview.tradeSnapshot);
  }, [viewingReview]);

  const sortedWeeklyReviews = useMemo(
    () => [...weeklyReviews].sort((left, right) => reviewSortValue(right) - reviewSortValue(left)),
    [weeklyReviews],
  );
  const clampedWeeklyIndex = Math.min(selectedWeeklyIndex, Math.max(sortedWeeklyReviews.length - 1, 0));
  const activeWeeklyReview = sortedWeeklyReviews[clampedWeeklyIndex] ?? null;
  const previousWeeklyReview = sortedWeeklyReviews[clampedWeeklyIndex + 1] ?? null;
  const weeklyTrend = getWeeklyTrend(activeWeeklyReview, previousWeeklyReview);

  const dailyReviewMap = useMemo(
    () => new Map(dailyReviews.filter((review) => review.reviewDate).map((review) => [review.reviewDate as string, review])),
    [dailyReviews],
  );
  const tradeReviewDates = useMemo(
    () => new Set(
      tradeReviews
        .map((review) => review.reviewDate || review.tradeSnapshot?.date || null)
        .filter((value): value is string => Boolean(value)),
    ),
    [tradeReviews],
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth, dailyReviewMap, tradeReviewDates),
    [currentMonth, dailyReviewMap, tradeReviewDates],
  );
  const isCalendarSelectionReady = dailyReviewsQuery.isFetched && tradeReviewsQuery.isFetched;

  useEffect(() => {
    if (!isCalendarSelectionReady) {
      return;
    }

    if (calendarDays.length === 0) {
      setSelectedDayKey(null);
      return;
    }

    const selectedDayInMonth = selectedDayKey
      ? calendarDays.find((day) => day.key === selectedDayKey && day.inCurrentMonth)
      : null;

    if (selectedDayInMonth) {
      return;
    }

    const reviewedDay = [...calendarDays].reverse().find((day) => (day.review || day.hasTradeReviews) && day.inCurrentMonth);
    const fallbackDay = calendarDays.find((day) => day.inCurrentMonth) ?? calendarDays[0];
    setSelectedDayKey((reviewedDay ?? fallbackDay)?.key ?? null);
  }, [calendarDays, isCalendarSelectionReady, selectedDayKey]);

  useEffect(() => {
    if (sortedWeeklyReviews.length === 0) {
      if (selectedWeeklyIndex !== 0) {
        setSelectedWeeklyIndex(0);
      }
      return;
    }

    if (selectedWeeklyIndex > sortedWeeklyReviews.length - 1) {
      setSelectedWeeklyIndex(sortedWeeklyReviews.length - 1);
    }
  }, [selectedWeeklyIndex, sortedWeeklyReviews]);

  useEffect(() => {
    if (!weeklyReviewsQuery.hasNextPage || weeklyReviewsQuery.isFetchingNextPage) {
      return;
    }

    if (selectedWeeklyIndex >= Math.max(sortedWeeklyReviews.length - 2, 0)) {
      void weeklyReviewsQuery.fetchNextPage();
    }
  }, [
    selectedWeeklyIndex,
    sortedWeeklyReviews.length,
    weeklyReviewsQuery,
  ]);

  const selectedDay = calendarDays.find((day) => day.key === selectedDayKey) ?? null;
  const selectedDailyReview = selectedDayKey ? dailyReviewMap.get(selectedDayKey) ?? null : null;

  const selectedTradeReviews = useMemo(
    () => [...tradeReviews]
      .filter((review) => selectedDayKey ? isReviewForDate(review, selectedDayKey) : false)
      .sort((left, right) => reviewSortValue(right) - reviewSortValue(left)),
    [selectedDayKey, tradeReviews],
  );

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
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the trade review right now.";
      toast.error(message);
    },
  });

  function openCreateModal(type: Exclude<ReviewType, "trade">, presetDate?: string) {
    setReviewType(type);
    setEditingReview(null);
    setDailyForm({ ...emptyDailyForm, reviewDate: presetDate ?? emptyDailyForm.reviewDate });
    setWeeklyForm(emptyWeeklyForm);
    setOpen(true);
  }

  async function openEditModal(review: Review) {
    const scope = getReviewScope(review);

    if (scope === "trade") {
      const snapshotTrade = buildTradeFromSnapshot(review.tradeSnapshot);

      if (snapshotTrade) {
        setTradeReviewTrade(snapshotTrade);
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
    setReviewType(scope as Exclude<ReviewType, "trade">);

    if (scope === "daily") {
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
  }

  const isInitialLoading = !dailyReviewsQuery.data && !weeklyReviewsQuery.data && !tradeReviewsQuery.data
    && (dailyReviewsQuery.isLoading || weeklyReviewsQuery.isLoading || tradeReviewsQuery.isLoading);

  useUnauthorizedSessionGuard(dailyReviewsQuery.error, weeklyReviewsQuery.error, tradeReviewsQuery.error);

  if (isInitialLoading) {
    return <ReviewsSkeleton />;
  }

  if (dailyReviewsQuery.isError || weeklyReviewsQuery.isError || tradeReviewsQuery.isError) {
    const errorState = getPageErrorState(dailyReviewsQuery.error ?? weeklyReviewsQuery.error ?? tradeReviewsQuery.error, {
      unavailableTitle: "Reviews unavailable",
      unavailableDescription: "The reviews service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Reviews request invalid",
      validationDescription: "The review filters in this request are invalid.",
      timeoutTitle: "Reviews request timed out",
      timeoutDescription: "Loading reviews took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([
            dailyReviewsQuery.refetch(),
            weeklyReviewsQuery.refetch(),
            tradeReviewsQuery.refetch(),
          ]);
        } : undefined}
        isRetrying={dailyReviewsQuery.isFetching || weeklyReviewsQuery.isFetching || tradeReviewsQuery.isFetching}
      />
    );
  }

  const monthLabel = format(currentMonth, "MMMM yyyy");

  return (
    <PageShell size="wide">
      <PageHeader
        title="Reviews"
        actions={(
          <>
            <Button variant="outline" className="rounded-2xl px-4" onClick={() => openCreateModal("daily", selectedDayKey ?? emptyDailyForm.reviewDate)}>
              <Plus className="h-4 w-4" />
              Daily Review
            </Button>
            <Button className="rounded-2xl px-4" onClick={() => openCreateModal("weekly")}>
              <Plus className="h-4 w-4" />
              Weekly Review
            </Button>
          </>
        )}
      />

      <SectionCard className="overflow-hidden border-primary/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_34%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)/0.96))] p-0">
        <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label mb-2">Weekly Review</p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  {activeWeeklyReview ? `${activeWeeklyReview.weeklyRating ?? 0}/10` : "No weekly review yet"}
                </h2>
              </div>
            <div className="flex items-center gap-2">
              {activeWeeklyReview ? (
                <>
                  <Button
                      variant="outline"
                      size="icon"
                      aria-label="Previous week"
                    onClick={() => {
                      setSelectedWeeklyIndex((value) => {
                        const nextValue = Math.min(value + 1, sortedWeeklyReviews.length - 1);

                        if (
                          weeklyReviewsQuery.hasNextPage
                          && !weeklyReviewsQuery.isFetchingNextPage
                          && nextValue >= Math.max(sortedWeeklyReviews.length - 2, 0)
                        ) {
                          void weeklyReviewsQuery.fetchNextPage();
                        }

                        return nextValue;
                      });
                    }}
                    disabled={clampedWeeklyIndex >= sortedWeeklyReviews.length - 1}
                  >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Next week"
                      onClick={() => setSelectedWeeklyIndex((value) => Math.max(value - 1, 0))}
                      disabled={clampedWeeklyIndex === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="View weekly review" onClick={() => setViewingReview(activeWeeklyReview)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Edit weekly review" onClick={() => void openEditModal(activeWeeklyReview)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {activeWeeklyReview
                ? `${format(parseISO(activeWeeklyReview.weekStart || activeWeeklyReview.createdAt), "MMM d")} - ${format(parseISO(activeWeeklyReview.weekEnd || activeWeeklyReview.updatedAt), "MMM d, yyyy")}`
                : "Add a weekly review to see your summary."}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium",
                  weeklyTrend.tone === "success" && "border-success/20 bg-success/[0.08] text-success",
                  weeklyTrend.tone === "danger" && "border-danger/20 bg-danger/[0.08] text-danger",
                  weeklyTrend.tone === "default" && "border-border/60 bg-background/70 text-muted-foreground",
                )}
              >
                {weeklyTrend.label}
              </div>
              {activeWeeklyReview ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-sm text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  {clampedWeeklyIndex === 0 ? "Latest" : "Earlier week"}
                </div>
              ) : null}
              {weeklyReviewsQuery.hasNextPage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-3"
                  onClick={() => void weeklyReviewsQuery.fetchNextPage()}
                  disabled={weeklyReviewsQuery.isFetchingNextPage}
                >
                  {weeklyReviewsQuery.isFetchingNextPage ? "Loading older weeks..." : "Load Older Weeks"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
              <p className="text-label mb-2">Strength</p>
              <p className="text-base font-medium leading-7 text-foreground">{getWeeklyStrength(activeWeeklyReview)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
              <p className="text-label mb-2">Improvement</p>
              <p className="text-base font-medium leading-7 text-foreground">{getWeeklyImprovement(activeWeeklyReview)}</p>
            </div>
            <div className="lg:col-span-2">
              <Progress value={(activeWeeklyReview?.weeklyRating ?? 0) * 10} className="h-2 bg-background/70" />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <SectionCard className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label mb-2">Calendar</p>
              <h2 className="text-2xl font-semibold text-foreground">{monthLabel}</h2>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setCurrentMonth((value) => addMonths(value, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setCurrentMonth((value) => addMonths(value, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" /> Strong</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" /> Mixed</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" /> Review</span>
          </div>

          <div className="grid grid-cols-7 gap-3 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {calendarDays.map((day) => (
              <button
                key={day.key}
                type="button"
                aria-label={format(day.date, "MMMM d, yyyy")}
                className={cn(
                  "rounded-[1.45rem] p-2 text-center transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !day.inCurrentMonth && "opacity-40",
                )}
                onClick={() => {
                  setSelectedDayKey(day.key);
                  if (!day.inCurrentMonth) {
                    setCurrentMonth(startOfMonth(day.date));
                  }
                }}
              >
                <p className="text-[11px] font-medium text-muted-foreground">{day.dayLabel}</p>
                <div
                  className={cn(
                    "mt-2 flex aspect-square items-center justify-center rounded-[1.25rem] border",
                    day.tone === "good" && "border-emerald-500/20 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300",
                    day.tone === "warn" && "border-amber-500/20 bg-amber-500/[0.12] text-amber-700 dark:text-amber-300",
                    day.tone === "bad" && "border-rose-500/20 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300",
                    day.tone === "review" && "border-rose-500/20 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300",
                    day.tone === "empty" && "border-border/60 bg-background/70 text-muted-foreground",
                    selectedDayKey === day.key && "ring-2 ring-primary/45 ring-offset-2 ring-offset-background",
                  )}
                >
                  {day.icon ? (
                    <span className="text-lg" aria-hidden="true">{day.icon}</span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-current/25" aria-hidden="true" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="h-fit overflow-hidden p-0 xl:sticky xl:top-6">
          <div className="border-b border-border/60 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label mb-2">Day</p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {selectedDay ? format(selectedDay.date, "EEE, MMM d") : "Select a day"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {selectedDailyReview ? (
                  <>
                    <Button variant="ghost" size="icon" aria-label="View daily review" onClick={() => setViewingReview(selectedDailyReview)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Edit daily review" onClick={() => void openEditModal(selectedDailyReview)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => openCreateModal("daily", selectedDayKey ?? emptyDailyForm.reviewDate)}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 px-5 py-5 sm:px-6">
            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedDailyReview?.emotion ? <TagChip label={selectedDailyReview.emotion} kind="emotion" /> : null}
                {selectedDailyReview?.followedRules ? <TagChip label={selectedDailyReview.followedRules} kind="emotion" /> : null}
              </div>

              <div className="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
                <p className="text-label mb-2">Discipline</p>
                <p className="text-lg font-semibold text-foreground">{getDailyDisciplineLabel(selectedDailyReview)}</p>
                {selectedDailyReview?.disciplineScore != null ? (
                  <p className="mt-1 text-sm text-muted-foreground">{selectedDailyReview.disciplineScore}/10 score</p>
                ) : null}
              </div>

              <div className="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
                <p className="text-label mb-2">Key Insight</p>
                <p className="text-base font-medium leading-7 text-foreground">{getDailyInsight(selectedDailyReview)}</p>
              </div>

              {!selectedDailyReview ? (
                <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                  Add a daily review for this day.
                </div>
              ) : null}
            </section>

            <section className="space-y-3 border-t border-border/60 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Trades</h3>
                </div>
                {selectedTradeReviews.length > 0 ? (
                  <span className="text-sm text-muted-foreground">{formatNumberDisplay(selectedTradeReviews.length)} linked</span>
                ) : null}
              </div>

              {selectedTradeReviews.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                  No trade reviews yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTradeReviews.map((review) => {
                    const trade = buildTradeFromSnapshot(review.tradeSnapshot);
                    const meta = getTradeReviewMeta(trade, review);

                    return (
                      <div
                        key={review.id}
                        className="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button type="button" className="min-w-0 text-left" onClick={() => setViewingReview(review)}>
                            <p className="text-base font-semibold text-foreground">{trade?.pair || "Linked trade"}</p>
                          </button>
                          {trade ? <ProfitDisplay value={trade.profit} /> : null}
                        </div>

                        <p className="mt-1 text-sm font-medium text-muted-foreground">{getTradeReviewJudgement(review)}</p>

                        <button type="button" className="mt-2 block text-left" onClick={() => setViewingReview(review)}>
                          <p className="text-sm font-medium leading-6 text-foreground">→ {getTradeReviewTakeaway(review)}</p>
                        </button>

                        {meta ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {meta}
                          </p>
                        ) : null}

                        {trade ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Entry {compactTradePrice(trade.entry)} · SL {compactTradePrice(trade.stopLoss)} · TP {compactTradePrice(trade.takeProfit)}
                          </p>
                        ) : null}

                        <div className="mt-3 flex items-center gap-2">
                          <Button size="sm" className="rounded-xl px-4" onClick={() => setViewingReview(review)}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" className="px-2 text-muted-foreground hover:text-foreground" onClick={() => void openEditModal(review)}>
                            Edit
                          </Button>
                          {review.tradeId ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto rounded-xl text-muted-foreground hover:text-foreground"
                              aria-label="Open trade"
                              onClick={() => navigate(`/trades/${review.tradeId}`)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </SectionCard>
      </div>

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
    </PageShell>
  );
}
