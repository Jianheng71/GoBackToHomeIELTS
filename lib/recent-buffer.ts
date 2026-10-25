import { mergeRecent, takeRecent, toRecent, type RecentQuestion } from "./dedupe";
import type { Question } from "./schema";

const buffer: RecentQuestion[] = [];

export function rememberQuestion(question: Question): void {
  buffer.unshift(toRecent(question));
  if (buffer.length > 50) buffer.length = 50;
}

export function serverRecent(): RecentQuestion[] {
  return takeRecent(buffer);
}

export function combinedRecent(client: readonly RecentQuestion[]): RecentQuestion[] {
  return mergeRecent([buffer, client]);
}
