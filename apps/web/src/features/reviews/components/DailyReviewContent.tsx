import { useQuery } from "@tanstack/react-query";
import type { Review } from "@/types";
import { useAuth } from "@/features/auth/auth-context";
import { EconomicCalendarEventCard } from "@/features/economic-calendar/components/EconomicCalendarEventCard";
import { formatDailyReviewLabel } from "@/utils/reviews";
import { ReviewMetricCard, ReviewTextSection } from "@/features/reviews/components/ReviewContentPrimitives";
import { getEconomicCalendarList } from "@/services/api/economic-calendar";
import { privateQueryKey } from "@/services/query-client";

interface DailyReviewContentProps {
  review: Review;
}

export function DailyReviewContent({ review }: DailyReviewContentProps) {
  const { user } = useAuth();
  const macroQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "daily-review", review.reviewDate),
    queryFn: () => getEconomicCalendarList({
      dateFrom: review.reviewDate ?? undefined,
      dateTo: review.reviewDate ?? undefined,
      impacts: ["high", "medium"],
    }),
    enabled: Boolean(review.reviewDate),
  });
  const macroEvents = macroQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReviewMetricCard label="Date" value={formatDailyReviewLabel(review.reviewDate)} />
        <ReviewMetricCard label="Discipline" value={`${review.disciplineScore ?? 0}/10`} />
        <ReviewMetricCard label="Rules" value={review.followedRules ?? "Not recorded"} />
        <ReviewMetricCard label="Emotion" value={review.emotion ?? "Not recorded"} />
      </div>

      {macroEvents.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Major events</h3>
          {macroEvents.slice(0, 4).map((event) => (
            <EconomicCalendarEventCard key={event.id} event={event} compact />
          ))}
        </div>
      ) : null}

      <ReviewTextSection label="What Went Well" value={review.wentWell} />
      <ReviewTextSection label="Mistakes" value={review.mistakes} />
      <ReviewTextSection label="Lesson Learned" value={review.lessonLearned} />
      <ReviewTextSection label="Improvement Plan" value={review.improvementPlan} />
    </div>
  );
}
