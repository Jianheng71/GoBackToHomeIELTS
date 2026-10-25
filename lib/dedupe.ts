import type { Question, SentenceFunction } from "./schema";

export type RecentQuestion = {
  meaning_zh_summary: string;
  meaning_zh?: string;
  topic_tags: string[];
  function: SentenceFunction;
};

const RECENT_LIMIT = 50;
const JACCARD_LIMIT = 0.6;

export function takeRecent(items: readonly RecentQuestion[]): RecentQuestion[] {
  return items.slice(0, RECENT_LIMIT);
}

export function toRecent(question: Pick<Question, "meaning_zh" | "topic_tags" | "function">): RecentQuestion {
  return {
    meaning_zh_summary: question.meaning_zh.slice(0, 80),
    meaning_zh: question.meaning_zh,
    topic_tags: question.topic_tags,
    function: question.function,
  };
}

/** Character bigrams, so Chinese sentences can be compared without a segmenter. */
export function jaccardSimilarity(left: string, right: string): number {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  a.forEach((gram) => {
    if (b.has(gram)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Same sentence function, plus either a shared topic tag or a meaning
 * similarity above 0.6. Matches the framework dedupe rule.
 */
export function isDuplicate(
  next: { function: SentenceFunction; topic_tags: string[]; meaning_zh: string },
  recent: readonly RecentQuestion[],
): boolean {
  const nextTags = contentTags(next.topic_tags);
  return takeRecent(recent).some((old) => {
    if (old.function !== next.function) return false;
    const oldTags = contentTags(old.topic_tags);
    const sharedTag = nextTags.some((tag) => oldTags.includes(tag));
    const oldMeaning = old.meaning_zh?.trim() || old.meaning_zh_summary;
    const similarity = jaccardSimilarity(
      stripTopics(oldMeaning, oldTags),
      stripTopics(next.meaning_zh, nextTags),
    );
    return sharedTag || similarity > JACCARD_LIMIT;
  });
}

export function mergeRecent(groups: readonly (readonly RecentQuestion[])[]): RecentQuestion[] {
  const seen = new Set<string>();
  const merged: RecentQuestion[] = [];
  for (const group of groups) {
    for (const item of group) {
      const meaning = (item.meaning_zh ?? item.meaning_zh_summary).trim();
      const key = `${item.function}|${meaning}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= RECENT_LIMIT) return merged;
    }
  }
  return merged;
}

function stripTopics(text: string, tags: readonly string[]): string {
  return tags.reduce(
    (current, tag) => current.split(tag).join(" "),
    text,
  );
}

function contentTags(tags: readonly string[]): string[] {
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && !/^[a-z_]+-\d+$/.test(tag));
}

function bigrams(text: string): Set<string> {
  const chars = Array.from(text.toLowerCase().replace(/\s+/g, "")).filter((char) =>
    /[\p{L}\p{N}]/u.test(char),
  );
  const grams = new Set<string>();
  if (chars.length === 1) grams.add(chars[0]!);
  for (let index = 0; index < chars.length - 1; index += 1) {
    grams.add(`${chars[index]}${chars[index + 1]}`);
  }
  return grams;
}
