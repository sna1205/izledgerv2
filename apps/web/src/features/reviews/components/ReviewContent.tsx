import type { Review, Trade } from "@/types";
import { getReviewScope } from "@/utils/reviews";
import { DailyReviewContent } from "@/features/reviews/components/DailyReviewContent";
import { TradeReviewContent } from "@/features/reviews/components/TradeReviewContent";
import { WeeklyReviewContent } from "@/features/reviews/components/WeeklyReviewContent";

interface ReviewContentProps {
  review: Review;
  linkedTrade?: Trade | null;
}

export function ReviewContent({ review, linkedTrade }: ReviewContentProps) {
  const scope = getReviewScope(review);

  if (scope === "daily") {
    return <DailyReviewContent review={review} />;
  }

  if (scope === "weekly") {
    return <WeeklyReviewContent review={review} />;
  }

  return <TradeReviewContent review={review} orphaned={!linkedTrade} />;
}
