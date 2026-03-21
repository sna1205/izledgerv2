import type { Review } from "@/types";
import { formatWeeklyReviewLabel } from "@/utils/reviews";
import { ReviewMetricCard, ReviewTextSection } from "@/features/reviews/components/ReviewContentPrimitives";

interface WeeklyReviewContentProps {
  review: Review;
}

export function WeeklyReviewContent({ review }: WeeklyReviewContentProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReviewMetricCard label="Week" value={formatWeeklyReviewLabel(review.weekStart, review.weekEnd)} />
        <ReviewMetricCard label="Weekly Rating" value={`${review.weeklyRating ?? 0}/10`} />
        <ReviewMetricCard label="Risk Management" value={review.riskManagement ?? "Not recorded"} />
        <ReviewMetricCard label="Next Goal Set" value={review.nextGoal ? "Yes" : "No"} />
      </div>

      <ReviewTextSection label="Weekly Summary" value={review.weeklySummary} />
      <ReviewTextSection label="Biggest Win" value={review.biggestWin} />
      <ReviewTextSection label="Biggest Mistake" value={review.biggestMistake} />
      <ReviewTextSection label="Next Goal" value={review.nextGoal} />
    </div>
  );
}
