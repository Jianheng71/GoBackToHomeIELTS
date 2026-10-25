import { describe, expect, it } from "vitest";
import { isDuplicate, toRecent, type RecentQuestion } from "./dedupe";
import { mockGenerateUnique } from "./mock-generator";

describe("mockGenerateUnique", () => {
  it("returns 20 questions without an obvious repeat", () => {
    const recent: RecentQuestion[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < 20; index += 1) {
      const question = mockGenerateUnique({
        topic_domain: "random",
        function: "random",
        difficulty: "random",
        recent_questions: recent,
        user_weakness: [],
      });
      expect(question).not.toBeNull();
      expect(question?.is_mock).toBe(true);
      expect(isDuplicate(question!, recent)).toBe(false);
      const skeleton = `${question!.function}|${question!.meaning_zh.replace(question!.topic_tags[0] ?? "", "")}`;
      expect(seen.has(skeleton)).toBe(false);
      seen.add(skeleton);
      recent.unshift(toRecent(question!));
    }
    expect(seen.size).toBe(20);
  });
});
