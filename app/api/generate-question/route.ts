import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { getOpenAIModelId, getOpenAIProvider, hasOpenAIKey, withRetry } from "@/lib/ai";
import { isDuplicate, toRecent, type RecentQuestion } from "@/lib/dedupe";
import { mockGenerateUnique } from "@/lib/mock-generator";
import { combinedRecent, rememberQuestion } from "@/lib/recent-buffer";
import {
  generateQuestionRequestSchema,
  leanSuggestedWords,
  questionCoreSchema,
  questionSchema,
  type GenerateQuestionRequest,
  type Question,
} from "@/lib/schema";

const DUPLICATE_MESSAGE = "这道题和最近练过的太像。请换一题。";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = generateQuestionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "请求参数无效", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const recent = combinedRecent(input.recent_questions);

  if (!hasOpenAIKey()) {
    return NextResponse.json(finishMock(input, recent));
  }

  try {
    const question = await withRetry(async (attempt) => {
      const provider = getOpenAIProvider();
      const retryNote =
        attempt > 0
          ? "\n上次题目与最近练习重复或未通过校验。请换一个话题标签和意思，严格按 schema 输出。"
          : "";
      const { object } = await generateObject({
        model: provider.chat(getOpenAIModelId()),
        schema: questionCoreSchema,
        system: `你是雅思学术写作的出题教练。只生成「句子级」练习题（用户写 1–2 句 / 约 50 词），不是整篇作文，不是翻译题。
meaning_zh 是需要论证的观点（约 20–35 字），不是让用户逐字翻译的完整中文句子。
suggested_words 取 45–55，向 50 靠拢。style 固定 academic。全部原创；不涉及明星、歌词、媒体原句。
不要重复最近题目的句子功能搭配和意思。`,
        prompt: `请生成一道雅思学术写作句子题。
话题域：${input.topic_domain}
句子功能：${input.function}
难度：${input.difficulty}
建议词数：约 50
最近题目（避免重复）：${JSON.stringify(recent)}
用户薄弱维度：${JSON.stringify(input.user_weakness)}${retryNote}`,
      });

      const question = questionSchema.parse({
        ...object,
        suggested_words: leanSuggestedWords(object.suggested_words),
        exam_safe: true,
        style: "academic",
        is_mock: false,
      });
      if (isDuplicate(question, recent)) {
        throw new Error("duplicate question");
      }
      return question;
    });
    rememberQuestion(question);
    return NextResponse.json(question satisfies Question);
  } catch {
    return NextResponse.json(finishMock(input, recent));
  }
}

/**
 * One programmatic draw, then a single retry against the same recent list.
 * If both collide, ask the client to press 换一题.
 */
function finishMock(
  input: GenerateQuestionRequest,
  recent: RecentQuestion[],
): Question | { duplicate: true; message: string } {
  const first = mockGenerateUnique({ ...input, recent_questions: recent });
  if (first && !isDuplicate(first, recent)) {
    rememberQuestion(first);
    return first;
  }
  const avoided = first ? [toRecent(first), ...recent] : recent;
  const second = mockGenerateUnique({ ...input, recent_questions: avoided });
  if (second && !isDuplicate(second, recent)) {
    rememberQuestion(second);
    return second;
  }
  return { duplicate: true, message: DUPLICATE_MESSAGE };
}
