import type { Review } from "@/lib/types";
import { ReviewMetricCard, ReviewTextSection } from "@/components/ReviewContentPrimitives";

interface TradeReviewContentProps {
  review: Review;
  orphaned?: boolean;
}

export function TradeReviewContent({ review, orphaned = false }: TradeReviewContentProps) {
  return (
    <div className="space-y-4">
      {orphaned && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Linked trade not found. This review was preserved to protect journal history.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReviewMetricCard label="Execution" value={`${review.executionRating ?? 0}/5`} />
        <ReviewMetricCard label="Discipline" value={`${review.disciplineScore ?? 0}/5`} />
        <ReviewMetricCard label="Emotion" value={`${review.emotionRating ?? 0}/5`} />
        <ReviewMetricCard label="Take Again?" value={review.wouldTakeAgain === false ? "No" : "Yes"} />
      </div>

      {[
        ["What Went Well", review.whatWentWell],
        ["What Went Wrong", review.whatWentWrong],
        ["Mistakes Made", review.mistakesMade],
        ["Lesson Learned", review.lessonLearned],
        ["Improve Next Time", review.improvementForNextTrade],
      ].map(([label, value]) => (
        <ReviewTextSection key={label} label={label} value={value} />
      ))}
    </div>
  );
}
