import { useQuery } from "@tanstack/react-query";
import type { Review } from "@/types";
import { useAuth } from "@/features/auth/auth-context";
import { EconomicCalendarEventCard } from "@/features/economic-calendar/components/EconomicCalendarEventCard";
import { formatWeeklyReviewLabel } from "@/utils/reviews";
import { ReviewMetricCard, ReviewTextSection } from "@/features/reviews/components/ReviewContentPrimitives";
import { getEconomicCalendarList } from "@/services/api/economic-calendar";
import { privateQueryKey } from "@/services/query-client";

interface WeeklyReviewContentProps {
  review: Review;
}

export function WeeklyReviewContent({ review }: WeeklyReviewContentProps) {
  const { user } = useAuth();
  const macroQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "weekly-review", review.weekStart, review.weekEnd),
    queryFn: () => getEconomicCalendarList({
      dateFrom: review.weekStart ?? undefined,
      dateTo: review.weekEnd ?? undefined,
      impacts: ["high", "medium"],
    }),
    enabled: Boolean(review.weekStart && review.weekEnd),
  });
  const macroEvents = macroQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReviewMetricCard label="Week" value={formatWeeklyReviewLabel(review.weekStart, review.weekEnd)} />
        <ReviewMetricCard label="Rating" value={`${review.weeklyRating ?? 0}/10`} />
        <ReviewMetricCard label="Risk" value={review.riskManagement ?? "Not recorded"} />
        <ReviewMetricCard label="Goal" value={review.nextGoal ? "Yes" : "No"} />
      </div>

      {macroEvents.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Major events</h3>
          {macroEvents.slice(0, 6).map((event) => (
            <EconomicCalendarEventCard key={event.id} event={event} compact />
          ))}
        </div>
      ) : null}

      <ReviewTextSection label="Weekly Summary" value={review.weeklySummary} />
      <ReviewTextSection label="Biggest Win" value={review.biggestWin} />
      <ReviewTextSection label="Biggest Mistake" value={review.biggestMistake} />
      <ReviewTextSection label="Next Goal" value={review.nextGoal} />
    </div>
  );
}
