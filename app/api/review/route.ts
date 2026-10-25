import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { locateSpans } from "@/lib/annotate";
import { getOpenAIModelId, getOpenAIProvider, hasOpenAIKey, withRetry } from "@/lib/ai";
import { mockReview } from "@/lib/mock-review";
import {
  reviewModelSchema,
  reviewRequestSchema,
  reviewResultSchemaForSentence,
  USER_SENTENCE_REWRITE_RULE,
  type ReviewResult,
} from "@/lib/schema";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = reviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "请求参数无效", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { question, user_sentence } = parsed.data;

  if (!hasOpenAIKey()) {
    return NextResponse.json(mockReview(question, user_sentence));
  }

  try {
    const result = await withRetry(async (attempt) => {
      const provider = getOpenAIProvider();
      const retryNote =
        attempt > 0
          ? "\n上次的进阶句没有基于用户原句，或标亮 quote 不在原句里。请只在用户原句上做最小修改，quote 必须逐字复制原句片段。"
          : "";
      const { object } = await generateObject({
        model: provider.chat(getOpenAIModelId()),
        schema: reviewModelSchema,
        system: `你是雅思学术句子教练。只评用户写下的 1–2 句（大约 50 词），不做整篇作文批改，不做翻译，也不要建成自动评分系统。
按 Task 2 的四项来看这一两句，四项同等重要，各约占这则评语的四分之一：
- TR 任务回应：有没有回应题目，立场或核心是否清楚，句内有没有理由、结果或限定。
- CC 衔接连贯：衔接是否自然。on the one hand、with the development of、every coin has two sides、in conclusion 这类机械套话要扣分。
- LR 词汇资源：用词是否精确，搭配和词级是否合适，有没有拼写错误。不常见的词只有用对才算加分。
- GRA 语法范围与准确：句式用得是否正确。从句和被动只用对了才算范围，用错就是准确度问题。简单句写对，好过复杂句写破。
每一项都写 judgment（简短判定）、points（1–4 条具体加减分，引用用户原词）、suggestion（一条可改建议）。signal 只能是 plus、mixed 或 minus。不要输出雅思 0–9 档，不要输出总分。
${USER_SENTENCE_REWRITE_RULE}
spans 只标用户原句里真实存在的片段。每条给出 kind（upgrade、grammar 或 spelling）、message、可选 suggestion，以及 quote。quote 必须是原句里的连续原文。不要填写字符下标，服务器会按 quote 定位。找不到原文就不要编这一条。
cards 输出 0–3 张（collocation 或 pattern）。expression 必须出现在 source_sentence 里，source_sentence 来自这句进阶改写。exam_safe 必须为 true，style 必须为 academic。
rewrite_prompt 用中文，要求用户基于自己的原句重写。不得编造数据，不得生成歌词、明星语录或媒体原句。`,
        prompt: `题目：${JSON.stringify(question)}
用户原句：${user_sentence}${retryNote}`,
      });

      return reviewResultSchemaForSentence(user_sentence).parse({
        ...object,
        spans: locateSpans(user_sentence, object.spans),
        is_mock: false,
        style: "academic",
        cards: object.cards.slice(0, 3).map((card) => ({
          ...card,
          exam_safe: true as const,
          style: "academic" as const,
        })),
      });
    });

    return NextResponse.json(result satisfies ReviewResult);
  } catch {
    return NextResponse.json(mockReview(question, user_sentence));
  }
}
