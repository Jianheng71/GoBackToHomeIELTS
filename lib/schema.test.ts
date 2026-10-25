import { describe, expect, it } from "vitest";
import { mockReview } from "./mock-review";
import { practiceSettingsSchema } from "./storage";
import { locateSpans } from "./annotate";
import {
  isRewriteOfUserSentence,
  questionSchema,
  reviewResultSchema,
  vocabCardSchema,
} from "./schema";
import { mockGenerateUnique } from "./mock-generator";

describe("schemas", () => {
  it("keeps saved topic filters when older settings omit reduce motion", () => {
    const parsed = practiceSettingsSchema.parse({
      topic_domain: "education",
      function: "hedging",
      difficulty: "hard",
    });
    expect(parsed.topic_domain).toBe("education");
    expect(parsed.reduce_motion).toBe(false);
  });

  it("accepts a programmatic mock question", () => {
    const question = mockGenerateUnique({
      topic_domain: "education",
      function: "hedging",
      difficulty: "medium",
      recent_questions: [],
      user_weakness: [],
    });
    expect(question).not.toBeNull();
    expect(questionSchema.parse(question).is_mock).toBe(true);
    expect(question?.suggested_words).toBeGreaterThanOrEqual(45);
    expect(question?.suggested_words).toBeLessThanOrEqual(55);
    expect(question?.style).toBe("academic");
  });

  it("accepts a mock review with four criteria, one upgrade, and located spans", () => {
    const question = mockGenerateUnique({
      topic_domain: "work",
      function: "concession",
      difficulty: "easy",
      recent_questions: [],
      user_weakness: [],
    });
    const userSentence = "Remote work is good for everyone.";
    const review = mockReview(question!, userSentence);
    const parsed = reviewResultSchema.parse(review);
    expect(parsed.is_mock).toBe(true);
    expect(parsed.style).toBe("academic");
    expect(isRewriteOfUserSentence(userSentence, parsed.upgrade)).toBe(true);
    expect(parsed.upgrade.toLowerCase()).toContain("remote work");
    expect(parsed.upgrade.toLowerCase()).not.toContain("digital literacy");
    expect(parsed).not.toHaveProperty("analysis");
    expect(
      isRewriteOfUserSentence(
        userSentence,
        "Although digital literacy may offer certain benefits, access remains uneven.",
      ),
    ).toBe(false);
    for (const key of ["tr", "cc", "lr", "gra"] as const) {
      expect(parsed.scores[key].judgment.length).toBeGreaterThan(0);
      expect(parsed.scores[key].points.length).toBeGreaterThan(0);
      expect(parsed.scores[key].suggestion.length).toBeGreaterThan(0);
      expect(["plus", "mixed", "minus"]).toContain(parsed.scores[key].signal);
    }
    expect(parsed).not.toHaveProperty("diagnosis");
    expect(parsed).not.toHaveProperty("upgrades");
    const longerText =
      "Although remote work may help some staff, the benefit is uneven and companies should still support people who cannot stay online.";
    const longer = mockReview(question!, longerText);
    expect(isRewriteOfUserSentence(longerText, longer.upgrade)).toBe(true);
    expect(longer.upgrade.toLowerCase()).toContain("remote work");
    expect(longer.upgrade.toLowerCase()).toContain("cannot stay online");
    const marked = "Althogh remote work is very good for everyone and people is happy.";
    const markedReview = mockReview(question!, marked);
    expect(isRewriteOfUserSentence(marked, markedReview.upgrade)).toBe(true);
    const kinds = new Set(markedReview.spans.map((span) => span.kind));
    expect(kinds.has("spelling")).toBe(true);
    expect(kinds.has("grammar")).toBe(true);
    expect(kinds.has("upgrade")).toBe(true);
    for (const span of markedReview.spans) {
      expect(marked.slice(span.start, span.end)).toBe(span.quote);
    }
    const located = locateSpans(marked, [
      { kind: "spelling", message: "拼写", quote: "Althogh", suggestion: "Although" },
      { kind: "grammar", message: "一致", quote: "people is" },
    ]);
    expect(marked.slice(located[0].start, located[0].end)).toBe("Althogh");
    expect(marked.slice(located[1].start, located[1].end)).toBe("people is");
    expect(locateSpans(marked, [{ kind: "upgrade", message: "没有", quote: "digital literacy" }])).toEqual(
      [],
    );
    expect(parsed.cards.length).toBeGreaterThanOrEqual(1);
    expect(parsed.cards.length).toBeLessThanOrEqual(3);
    for (const card of parsed.cards) {
      expect(vocabCardSchema.parse(card).exam_safe).toBe(true);
      expect(card.style).toBe("academic");
      expect(card.source_sentence.toLowerCase()).toContain(card.expression.toLowerCase());
      expect(card.source_sentence.length).toBeGreaterThan(0);
      expect(card.meaning_zh.length).toBeGreaterThan(0);
      expect(card.usage.length).toBeGreaterThan(0);
      expect(card.pitfall.length).toBeGreaterThan(0);
    }
  });
});
