import type { Review } from "@/types";
import { formatDailyReviewLabel } from "@/utils/reviews";
import { ReviewMetricCard, ReviewTextSection } from "@/features/reviews/components/ReviewContentPrimitives";

interface DailyReviewContentProps {
  review: Review;
}

export function DailyReviewContent({ review }: DailyReviewContentProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReviewMetricCard label="Date" value={formatDailyReviewLabel(review.reviewDate)} />
        <ReviewMetricCard label="Discipline" value={`${review.disciplineScore ?? 0}/10`} />
        <ReviewMetricCard label="Rules" value={review.followedRules ?? "Not recorded"} />
        <ReviewMetricCard label="Emotion" value={review.emotion ?? "Not recorded"} />
      </div>
      <ReviewTextSection label="What Went Well" value={review.wentWell} />
      <ReviewTextSection label="Mistakes" value={review.mistakes} />
      <ReviewTextSection label="Lesson Learned" value={review.lessonLearned} />
      <ReviewTextSection label="Improvement Plan" value={review.improvementPlan} />
    </div>
  );
}
