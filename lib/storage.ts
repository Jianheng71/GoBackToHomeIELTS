import { z } from "zod";
import type { RecentQuestion } from "./dedupe";
import { takeRecent } from "./dedupe";
import { mintFinalCards } from "./mint-cards";
import type { ProgressState } from "./progress";
import type { Question, ReviewResult, VocabCard } from "./schema";
import {
  difficultySchema,
  sentenceFunctionSchema,
  topicDomainSchema,
  vocabCardSchema,
} from "./schema";
import { applyGrade, defaultSrsState, type SuperMemoGrade } from "./srs";
import { rewriteIssue } from "./text-metrics";

export const STORAGE_KEYS = {
  cards: "gbth_cards",
  progress: "gbth_progress",
  settings: "gbth_settings",
  recent: "gbth_recent_questions",
} as const;

const srsStateSchema = z.object({
  interval: z.number(),
  repetition: z.number(),
  efactor: z.number(),
  dueDate: z.string().optional(),
  lastReviewedAt: z.string().optional(),
});

export const storedCardSchema = vocabCardSchema.extend({
  id: z.string().min(1),
  created_at: z.string().min(1),
  user_rewrite: z.string().min(1),
  prompt_meaning_zh: z.string().min(1),
  srs: srsStateSchema,
});

export type StoredCard = z.infer<typeof storedCardSchema>;

const progressSchema = z.object({
  reviews_submitted: z.number().int().nonnegative(),
  sentences_completed: z.number().int().nonnegative(),
  srs_reviews_completed: z.number().int().nonnegative(),
  activity_dates: z.array(z.string()),
});

export const practiceSettingsSchema = z.object({
  topic_domain: z.union([topicDomainSchema, z.literal("random")]),
  function: z.union([sentenceFunctionSchema, z.literal("random")]),
  difficulty: z.union([difficultySchema, z.literal("random")]),
  reduce_motion: z.boolean().optional().default(false),
});

export type PracticeSettings = z.infer<typeof practiceSettingsSchema>;

export const defaultPracticeSettings: PracticeSettings = {
  topic_domain: "random",
  function: "random",
  difficulty: "random",
  reduce_motion: false,
};

const recentQuestionSchema = z.object({
  meaning_zh_summary: z.string(),
  meaning_zh: z.string().optional(),
  topic_tags: z.array(z.string()),
  function: sentenceFunctionSchema,
});

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson(key: string): unknown {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readStoredCards(): StoredCard[] {
  const parsed = z.array(storedCardSchema).safeParse(readJson(STORAGE_KEYS.cards));
  return parsed.success ? parsed.data : [];
}

export function writeStoredCards(cards: StoredCard[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEYS.cards, JSON.stringify(cards));
  window.dispatchEvent(new Event("gbth-cards-updated"));
}

export function appendStoredCards(incoming: StoredCard[]): StoredCard[] {
  const next = [...readStoredCards(), ...incoming];
  writeStoredCards(next);
  return incoming;
}

/**
 * Persists 1–3 final cards. Rejects when the rewrite is missing or unchanged.
 * New cards are due immediately so the review queue can pick them up.
 */
export function saveCardsAfterRewrite(input: {
  question: Question;
  original: string;
  rewrite: string;
  review: ReviewResult;
}): StoredCard[] {
  const issue = rewriteIssue(input.original, input.rewrite);
  if (issue) {
    throw new Error(issue);
  }

  const minted: VocabCard[] = mintFinalCards(input.review, input.rewrite);
  if (minted.length < 1 || minted.length > 3) {
    throw new Error("词伙卡数量应为 1–3 张");
  }

  const now = new Date().toISOString();
  const records = minted.map((card) =>
    storedCardSchema.parse({
      ...card,
      id: crypto.randomUUID(),
      created_at: now,
      user_rewrite: input.rewrite.trim(),
      prompt_meaning_zh: input.question.meaning_zh,
      srs: { ...defaultSrsState, dueDate: now },
    }),
  );

  return appendStoredCards(records);
}

export function gradeStoredCard(id: string, grade: SuperMemoGrade): StoredCard {
  const cards = readStoredCards();
  const index = cards.findIndex((card) => card.id === id);
  if (index < 0) {
    throw new Error("找不到这张卡片");
  }
  const current = cards[index]!;
  const next: StoredCard = {
    ...current,
    srs: applyGrade(current.srs, grade),
  };
  cards[index] = storedCardSchema.parse(next);
  writeStoredCards(cards);
  updateProgress((progress) => ({
    ...progress,
    srs_reviews_completed: progress.srs_reviews_completed + 1,
  }));
  return cards[index]!;
}

export function readProgress(): ProgressState {
  const parsed = progressSchema.safeParse(readJson(STORAGE_KEYS.progress));
  return parsed.success
    ? parsed.data
    : {
        reviews_submitted: 0,
        sentences_completed: 0,
        srs_reviews_completed: 0,
        activity_dates: [],
      };
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function writeProgress(progress: ProgressState): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  window.dispatchEvent(new Event("gbth-progress-updated"));
}

function updateProgress(change: (progress: ProgressState) => ProgressState): ProgressState {
  const next = change(readProgress());
  writeProgress(next);
  return next;
}

export function recordReviewSubmitted(): void {
  updateProgress((progress) => ({
    ...progress,
    reviews_submitted: progress.reviews_submitted + 1,
  }));
}

export function recordSentenceCompleted(now = new Date()): void {
  const key = localDateKey(now);
  updateProgress((progress) => ({
    ...progress,
    sentences_completed: progress.sentences_completed + 1,
    activity_dates: progress.activity_dates.includes(key)
      ? progress.activity_dates
      : [...progress.activity_dates, key],
  }));
}

export function readSettings(): PracticeSettings {
  const raw = readJson(STORAGE_KEYS.settings);
  const parsed = practiceSettingsSchema.safeParse({
    ...defaultPracticeSettings,
    ...(raw && typeof raw === "object" ? raw : {}),
  });
  return parsed.success ? parsed.data : { ...defaultPracticeSettings };
}

export function writeSettings(settings: PracticeSettings): void {
  if (!canUseStorage()) return;
  const parsed = practiceSettingsSchema.parse({
    ...defaultPracticeSettings,
    ...readSettings(),
    ...settings,
  });
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(parsed));
  window.dispatchEvent(new Event("gbth-settings-updated"));
}

export function readRecentQuestions(): RecentQuestion[] {
  const parsed = z.array(recentQuestionSchema).safeParse(readJson(STORAGE_KEYS.recent));
  return parsed.success ? takeRecent(parsed.data) : [];
}

export function writeRecentQuestions(items: readonly RecentQuestion[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    STORAGE_KEYS.recent,
    JSON.stringify(takeRecent(items)),
  );
}

export function clearLocalData(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEYS.cards);
  window.localStorage.removeItem(STORAGE_KEYS.progress);
  window.localStorage.removeItem(STORAGE_KEYS.settings);
  window.localStorage.removeItem(STORAGE_KEYS.recent);
  window.dispatchEvent(new Event("gbth-cards-updated"));
  window.dispatchEvent(new Event("gbth-progress-updated"));
  window.dispatchEvent(new Event("gbth-settings-updated"));
}
