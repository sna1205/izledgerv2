import type { Review, Trade } from "@/lib/types";
import { getReviewScope } from "@/lib/reviews";
import { TradeReviewSummary } from "@/components/TradeReviewSummary";

function SummaryChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-background px-3 py-1 text-muted-foreground">
      {children}
    </span>
  );
}

function DailyReviewSummary({ review }: { review: Review }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <SummaryChip>Discipline: {review.disciplineScore ?? 0}/10</SummaryChip>
      <SummaryChip>Rules: {review.followedRules ?? "Not recorded"}</SummaryChip>
      <SummaryChip>Emotion: {review.emotion ?? "Not recorded"}</SummaryChip>
    </div>
  );
}

function WeeklyReviewSummary({ review }: { review: Review }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <SummaryChip>Rating: {review.weeklyRating ?? 0}/10</SummaryChip>
      <SummaryChip>Risk Management: {review.riskManagement ?? "Not recorded"}</SummaryChip>
      <SummaryChip>Next Goal: {review.nextGoal ? "Set" : "Not recorded"}</SummaryChip>
    </div>
  );
}

function TradeReviewListSummary({ trade }: { trade?: Trade | null }) {
  if (!trade) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Linked trade not found. This review was preserved to protect journal history.
      </div>
    );
  }

  return <TradeReviewSummary trade={trade} />;
}

interface ReviewListSummaryProps {
  review: Review;
  linkedTrade?: Trade | null;
}

export function ReviewListSummary({ review, linkedTrade }: ReviewListSummaryProps) {
  const scope = getReviewScope(review);

  if (scope === "daily") {
    return <DailyReviewSummary review={review} />;
  }

  if (scope === "weekly") {
    return <WeeklyReviewSummary review={review} />;
  }

  return <TradeReviewListSummary trade={linkedTrade} />;
}
