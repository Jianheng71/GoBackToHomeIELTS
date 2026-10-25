import { z } from "zod";
import {
  generateQuestionRequestSchema,
  questionSchema,
  reviewResultSchema,
  type Question,
  type QuestionCore,
  type ReviewResult,
} from "./schema";

export type GenerateQuestionInput = z.input<typeof generateQuestionRequestSchema>;

function errorMessage(json: unknown, fallback: string): string {
  if (
    json &&
    typeof json === "object" &&
    "error" in json &&
    typeof (json as { error: unknown }).error === "string"
  ) {
    return (json as { error: string }).error;
  }
  return fallback;
}

export type FetchQuestionResult =
  | { kind: "question"; question: Question }
  | { kind: "duplicate"; message: string };

export async function fetchQuestion(
  body: GenerateQuestionInput,
): Promise<FetchQuestionResult> {
  let response: Response;
  try {
    response = await fetch("/api/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("题目生成失败，请检查网络后重试");
  }

  const json: unknown = await response.json().catch(() => null);
  if (
    json &&
    typeof json === "object" &&
    "duplicate" in json &&
    (json as { duplicate: unknown }).duplicate === true
  ) {
    const message =
      "message" in json && typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : "这道题和最近练过的太像。请换一题。";
    return { kind: "duplicate", message };
  }
  const parsed = questionSchema.safeParse(json);
  if (!response.ok || !parsed.success) {
    throw new Error(
      errorMessage(json, "题目生成失败，请再试一次"),
    );
  }
  return { kind: "question", question: parsed.data };
}

export async function fetchReview(input: {
  question: QuestionCore;
  user_sentence: string;
}): Promise<ReviewResult> {
  let response: Response;
  try {
    response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("评阅失败，请检查网络后重试");
  }

  const json: unknown = await response.json().catch(() => null);
  const parsed = reviewResultSchema.safeParse(json);
  if (!response.ok || !parsed.success) {
    throw new Error(errorMessage(json, "评阅结果无法读取，请再试一次"));
  }
  return parsed.data;
}
