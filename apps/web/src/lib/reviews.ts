import { Review } from "./types";

const STORAGE_KEY = "trading-journal-reviews";

function normalizeReview(review: Review): Review {
  const scope = review.reviewScope || review.type || "daily";

  return {
    ...review,
    type: (review.type || scope) as Review["type"],
    reviewScope: scope,
  };
}

export function getReviews(): Review[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as Review[]).map(normalizeReview);
  } catch {
    return [];
  }
}

export function saveReviews(reviews: Review[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

export function addReview(review: Omit<Review, "id" | "createdAt" | "updatedAt">): Review {
  const next: Review = normalizeReview({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...review,
  });

  saveReviews([next, ...getReviews()]);
  return next;
}

export function updateReview(updated: Review): void {
  saveReviews(
    getReviews().map((review) =>
      review.id === updated.id
        ? normalizeReview({
            ...updated,
            updatedAt: new Date().toISOString(),
          })
        : review,
    ),
  );
}

export function deleteReview(id: string): void {
  saveReviews(getReviews().filter((review) => review.id !== id));
}

export function getReviewsByTradeId(tradeId: string): Review[] {
  return getReviews().filter((review) => review.tradeId === tradeId);
}

export function getReviewByTradeId(tradeId: string): Review | undefined {
  return getReviews().find((review) => review.tradeId === tradeId);
}

export function deleteReviewsByTradeId(tradeId: string): void {
  saveReviews(getReviews().filter((review) => review.tradeId !== tradeId));
}
