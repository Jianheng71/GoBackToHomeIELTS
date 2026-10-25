import type { StoredCard } from "./storage";
import { isDue } from "./srs";

export type ProgressState = {
  reviews_submitted: number;
  sentences_completed: number;
  srs_reviews_completed: number;
  activity_dates: string[];
};

export const emptyProgress: ProgressState = {
  reviews_submitted: 0,
  sentences_completed: 0,
  srs_reviews_completed: 0,
  activity_dates: [],
};

export type ProgressSummary = {
  sentencesCompleted: number;
  reviewsSubmitted: number;
  rewriteRate: number | null;
  cardsTotal: number;
  cardsDue: number;
  cardsReviewed: number;
  srsReviewsCompleted: number;
  reviewRate: number | null;
  streakDays: number;
};

export function summarizeProgress(
  progress: ProgressState,
  cards: readonly StoredCard[],
  now = new Date(),
): ProgressSummary {
  const cardsReviewed = cards.filter((card) => Boolean(card.srs.lastReviewedAt)).length;
  return {
    sentencesCompleted: progress.sentences_completed,
    reviewsSubmitted: progress.reviews_submitted,
    rewriteRate:
      progress.reviews_submitted === 0
        ? null
        : progress.sentences_completed / progress.reviews_submitted,
    cardsTotal: cards.length,
    cardsDue: cards.filter((card) => isDue(card.srs, now)).length,
    cardsReviewed,
    srsReviewsCompleted: progress.srs_reviews_completed,
    reviewRate: cards.length === 0 ? null : cardsReviewed / cards.length,
    streakDays: practiceStreak(progress.activity_dates, now),
  };
}

export function practiceStreak(dates: readonly string[], now = new Date()): number {
  const unique = new Set(dates);
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!unique.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!unique.has(dateKey(cursor))) return 0;
  }
  let streak = 0;
  while (unique.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}
