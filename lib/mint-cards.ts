import type { ReviewResult, VocabCard } from "./schema";
import { vocabCardSchema } from "./schema";

/**
 * Final collocation / pattern cards. Call only after the rewrite gate passes.
 * Review payloads may carry proposed cards; they are not stored until this runs.
 */
export function mintFinalCards(
  review: ReviewResult,
  rewrite: string,
): VocabCard[] {
  const proposed = review.cards.slice(0, 3);
  const source = proposed.length > 0 ? proposed : [fallbackCard(review, rewrite)];
  return source.slice(0, 3).map((card) =>
    vocabCardSchema.parse({
      ...card,
      source_sentence: card.source_sentence.trim() || rewrite.trim(),
      exam_safe: true,
      style: "academic",
    }),
  );
}

function fallbackCard(review: ReviewResult, rewrite: string): VocabCard {
  return {
    type: "pattern",
    expression: "although … may …",
    source_sentence: review.upgrade || rewrite.trim(),
    meaning_zh: "尽管……可能……（让步并保留限定）",
    usage: "学术句里降低断言强度",
    pitfall: "Although 开头时不要再加 but",
    exam_safe: true,
    style: "academic",
  };
}
