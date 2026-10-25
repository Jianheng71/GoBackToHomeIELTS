import { createOpenAI } from "@ai-sdk/openai";

export function hasOpenAIKey(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key.length > 0 && !key.startsWith("sk-your"));
}

export function getOpenAIProvider() {
  if (!hasOpenAIKey()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

export function getOpenAIModelId(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/** Runs `fn` up to `attempts` times (default 2 = one retry). */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  attempts = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("request failed");
}
