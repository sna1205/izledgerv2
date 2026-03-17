import type { Review, Trade } from "@/lib/types";
import { getReviewScope } from "@/lib/reviews";
import { DailyReviewContent } from "@/components/DailyReviewContent";
import { TradeReviewContent } from "@/components/TradeReviewContent";
import { WeeklyReviewContent } from "@/components/WeeklyReviewContent";

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
