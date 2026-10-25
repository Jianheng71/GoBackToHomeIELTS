import { describe, expect, it } from "vitest";
import { isDuplicate, jaccardSimilarity, type RecentQuestion } from "./dedupe";

const recent: RecentQuestion[] = [
  {
    meaning_zh_summary: "尽管remote work带来便利，其潜在风险仍不应被忽视。",
    meaning_zh: "尽管remote work带来便利，其潜在风险仍不应被忽视。",
    topic_tags: ["remote work"],
    function: "concession",
  },
];

describe("dedupe", () => {
  it("treats identical text as a full overlap", () => {
    expect(jaccardSimilarity("academic hedging", "academic hedging")).toBe(1);
  });

  it("flags the same function when the topic tag or the sentence skeleton repeats", () => {
    expect(
      isDuplicate(
        {
          function: "concession",
          topic_tags: ["remote work"],
          meaning_zh: "另一句完全不同的意思，只是话题标签撞上了。",
        },
        recent,
      ),
    ).toBe(true);

    expect(
      isDuplicate(
        {
          function: "concession",
          topic_tags: ["housing"],
          meaning_zh: "尽管housing带来便利，其潜在风险仍不应被忽视。",
        },
        recent,
      ),
    ).toBe(true);
  });

  it("allows the same topic when the sentence function changes", () => {
    expect(
      isDuplicate(
        {
          function: "hedging",
          topic_tags: ["remote work"],
          meaning_zh: "目前还不能断言remote work一定有效。",
        },
        recent,
      ),
    ).toBe(false);
  });
});
