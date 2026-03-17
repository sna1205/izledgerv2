import { format, isValid, parseISO } from "date-fns";
import type { Review, ReviewType, Trade } from "@/lib/types";

function formatSafeDate(value: string | null | undefined, pattern: string) {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);

  if (!isValid(parsed)) {
    return null;
  }

  return format(parsed, pattern);
}

export function getReviewScope(review: Pick<Review, "type" | "reviewScope">): ReviewType {
  return review.reviewScope ?? review.type;
}

export function formatDailyReviewLabel(date?: string | null) {
  return formatSafeDate(date, "MMM d, yyyy") ?? "Daily review";
}

export function formatWeeklyReviewLabel(startDate?: string | null, endDate?: string | null) {
  const start = formatSafeDate(startDate, "MMM d");
  const end = formatSafeDate(endDate, "MMM d, yyyy");

  if (!start || !end) {
    return "Weekly review";
  }

  return `${start} - ${end}`;
}

export function getReviewTitle(review: Review, linkedTrade?: Trade | null) {
  const scope = getReviewScope(review);

  if (scope === "daily") {
    return formatDailyReviewLabel(review.reviewDate);
  }

  if (scope === "weekly") {
    return formatWeeklyReviewLabel(review.weekStart, review.weekEnd);
  }

  if (linkedTrade) {
    return `${linkedTrade.pair} • ${formatDailyReviewLabel(linkedTrade.date)}`;
  }

  return "Linked trade unavailable";
}
