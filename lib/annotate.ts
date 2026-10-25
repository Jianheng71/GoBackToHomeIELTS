import type { SentenceSpan, SpanDraft } from "./schema";

type Placed = { start: number; end: number };

function overlaps(span: Placed, placed: Placed[]): boolean {
  return placed.some((mark) => span.start < mark.end && mark.start < span.end);
}

/** First non-overlapping match. Case-insensitive pass is only a fallback. */
function findFree(haystack: string, needle: string, placed: Placed[], ci: boolean): Placed | null {
  if (!needle) return null;
  const h = ci ? haystack.toLowerCase() : haystack;
  const n = ci ? needle.toLowerCase() : needle;
  let from = 0;
  while (from <= h.length) {
    const index = h.indexOf(n, from);
    if (index < 0) return null;
    const span = { start: index, end: index + needle.length };
    if (!overlaps(span, placed)) return span;
    from = index + 1;
  }
  return null;
}

/**
 * Turn model quotes into offsets on the user sentence.
 * A quote wins over any start/end the model guessed.
 * Quotes that are not in the sentence are dropped.
 */
export function locateSpans(
  text: string,
  drafts: Array<SpanDraft & { start?: number; end?: number; original?: string }>,
): SentenceSpan[] {
  const norm = text.replace(/[’]/g, "'");
  const placed: SentenceSpan[] = [];
  for (const draft of drafts) {
    const needle = (draft.quote ?? draft.original ?? "").trim().replace(/[’]/g, "'");
    const found =
      (needle && findFree(norm, needle, placed, false)) ||
      (needle && findFree(norm, needle, placed, true)) ||
      null;
    let span = found;
    if (
      !span &&
      typeof draft.start === "number" &&
      typeof draft.end === "number" &&
      draft.start >= 0 &&
      draft.end <= norm.length &&
      draft.end > draft.start
    ) {
      const guessed = { start: draft.start, end: draft.end };
      if (!overlaps(guessed, placed)) span = guessed;
    }
    if (!span) continue;
    const quote = norm.slice(span.start, span.end);
    if (!quote.trim()) continue;
    placed.push({
      start: span.start,
      end: span.end,
      kind: draft.kind,
      message: draft.message,
      suggestion: draft.suggestion,
      quote,
    });
  }
  placed.sort((a, b) => a.start - b.start);
  return placed;
}
