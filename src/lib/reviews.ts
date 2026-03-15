import { Review } from "./types";

const STORAGE_KEY = "trading-journal-reviews";

export function getReviews(): Review[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Review[];
  } catch {
    return [];
  }
}

export function saveReviews(reviews: Review[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

export function addReview(review: Omit<Review, "id" | "createdAt" | "updatedAt">): Review {
  const next: Review = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...review,
  };

  saveReviews([next, ...getReviews()]);
  return next;
}

export function updateReview(updated: Review): void {
  saveReviews(
    getReviews().map((review) =>
      review.id === updated.id
        ? {
            ...updated,
            updatedAt: new Date().toISOString(),
          }
        : review,
    ),
  );
}

export function deleteReview(id: string): void {
  saveReviews(getReviews().filter((review) => review.id !== id));
}
