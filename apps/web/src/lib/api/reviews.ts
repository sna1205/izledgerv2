import type { Review } from "@/lib/types";
import { apiFetch } from "@/lib/api/client";

type ReviewType = Review["type"];

type DailyReviewPayload = {
  type: "daily";
  reviewDate: string;
  wentWell?: string | null;
  mistakes?: string | null;
  followedRules?: Review["followedRules"] | null;
  emotion?: Review["emotion"] | null;
  lessonLearned?: string | null;
  improvementPlan?: string | null;
  disciplineScore?: number | null;
};

type WeeklyReviewPayload = {
  type: "weekly";
  weekStart: string;
  weekEnd: string;
  weeklySummary?: string | null;
  biggestWin?: string | null;
  biggestMistake?: string | null;
  riskManagement?: Review["riskManagement"] | null;
  nextGoal?: string | null;
  weeklyRating?: number | null;
};

type TradeReviewPayload = {
  type: "trade";
  tradeId: string;
  reviewDate?: string | null;
  lessonLearned?: string | null;
  disciplineScore?: number | null;
  executionRating?: number | null;
  emotionRating?: number | null;
  whatWentWell?: string | null;
  whatWentWrong?: string | null;
  mistakesMade?: string | null;
  improvementForNextTrade?: string | null;
  wouldTakeAgain?: boolean | null;
};

export type ReviewPayload = DailyReviewPayload | WeeklyReviewPayload | TradeReviewPayload;

export type ReviewPatch = Partial<Omit<Review, "id" | "createdAt" | "updatedAt">> & {
  type?: ReviewType;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function buildQuery(params: { type?: ReviewType; tradeId?: string; page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function listReviews(params: { type?: ReviewType; tradeId?: string; page?: number; pageSize?: number } = {}) {
  return apiFetch<{ items: Review[]; pagination: Pagination }>(`/reviews${buildQuery(params)}`);
}

export function getReview(reviewId: string) {
  return apiFetch<{ review: Review }>(`/reviews/${reviewId}`);
}

export function createReview(payload: ReviewPayload) {
  return apiFetch<{ review: Review }>("/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateReview(reviewId: string, payload: ReviewPatch) {
  return apiFetch<{ review: Review }>(`/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteReview(reviewId: string) {
  return apiFetch<void>(`/reviews/${reviewId}`, {
    method: "DELETE",
  });
}
