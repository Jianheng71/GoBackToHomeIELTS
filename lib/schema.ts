import { z } from "zod";

export const topicDomainSchema = z.enum([
  "education",
  "technology",
  "environment",
  "government",
  "work",
  "urbanization",
  "media",
  "social_equity",
]);

export const sentenceFunctionSchema = z.enum([
  "cause_effect",
  "concession",
  "contrast",
  "hedging",
  "data_description",
  "opinion",
  "problem_solution",
  "example_generalization",
]);

export const difficultySchema = z.enum(["easy", "medium", "hard"]);

export const styleSchema = z.enum(["academic"]).default("academic");

export const questionCoreSchema = z.object({
  topic_domain: topicDomainSchema,
  function: sentenceFunctionSchema,
  difficulty: difficultySchema,
  meaning_zh: z.string().min(8).max(80),
  task_zh: z.string().min(8).max(200),
  constraints: z.array(z.string()).min(1).max(6),
  suggested_words: z.number().int().min(20).max(80),
  topic_tags: z.array(z.string()).min(1).max(5),
  exam_safe: z.boolean(),
  style: styleSchema,
});

export const questionSchema = questionCoreSchema.extend({
  is_mock: z.boolean(),
});

export const generateQuestionRequestSchema = z.object({
  topic_domain: z
    .union([topicDomainSchema, z.literal("random")])
    .optional()
    .default("random"),
  function: z
    .union([sentenceFunctionSchema, z.literal("random")])
    .optional()
    .default("random"),
  difficulty: z
    .union([difficultySchema, z.literal("random")])
    .optional()
    .default("random"),
  recent_questions: z
    .array(
      z.object({
        meaning_zh_summary: z.string(),
        meaning_zh: z.string().optional(),
        topic_tags: z.array(z.string()),
        function: sentenceFunctionSchema,
      }),
    )
    .max(50)
    .optional()
    .default([]),
  user_weakness: z.array(z.string()).optional().default([]),
});

export const vocabCardSchema = z.object({
  type: z.enum(["collocation", "pattern"]),
  expression: z.string().min(1),
  source_sentence: z.string().min(1),
  meaning_zh: z.string().min(1),
  usage: z.string().min(1),
  pitfall: z.string().min(1),
  exam_safe: z.literal(true),
  style: styleSchema,
});

/**
 * The single upgrade sentence must rewrite the user's own sentence.
 * There is no second draft and no safe-version field.
 */
export const USER_SENTENCE_REWRITE_RULE =
  "upgrade 只能有一句进阶版，而且必须改写用户原句：保留用户的意思和主要结构，只做学术润色或考试安全所必需的最小修改，从用户自己的用词出发。禁止编造无关新句，禁止用模板或库存例句整句替换，禁止再给稳妥版或第二稿。";

function userRewriteField() {
  return z.string().min(1).describe(USER_SENTENCE_REWRITE_RULE);
}

export const criterionSignalSchema = z.enum(["plus", "mixed", "minus"]);

/** Sentence-level note for one Task 2 criterion. Not an IELTS band. */
export const criterionScoreSchema = z.object({
  signal: criterionSignalSchema.describe(
    "plus=加分倾向，mixed=有得失，minus=有扣分。不是雅思 0–9 档。",
  ),
  judgment: z.string().min(1).max(180).describe("考官评语风的简短判定，只针对这 1–2 句。"),
  points: z
    .array(z.string().min(1))
    .min(1)
    .max(4)
    .describe("具体扣分或加分点，尽量引用用户原词。"),
  suggestion: z.string().min(1).max(240).describe("一条可执行的修改建议，仍基于用户原句。"),
});

export const scoresSchema = z
  .object({
    tr: criterionScoreSchema.describe(
      "TR 任务回应：是否回应题目、立场是否清楚、句内有没有理由或因果。约占这则句评的四分之一。",
    ),
    cc: criterionScoreSchema.describe(
      "CC 衔接连贯：衔接是否自然。机械模板词堆砌要扣分。约占这则句评的四分之一。",
    ),
    lr: criterionScoreSchema.describe(
      "LR 词汇资源：用词是否精确、搭配、词级和拼写。约占这则句评的四分之一。",
    ),
    gra: criterionScoreSchema.describe(
      "GRA 语法范围与准确：句式是否用对，从句或被动有没有用错。约占这则句评的四分之一。",
    ),
  })
  .describe("四项同等看待这一两句，不要输出雅思总分或 0–9 小分。");

export const spanKindSchema = z.enum(["upgrade", "grammar", "spelling"]);

/** What the model should emit. Offsets are computed locally from quote. */
export const spanDraftSchema = z.object({
  kind: spanKindSchema.describe("upgrade=可升级处，grammar=语法错误，spelling=拼写错误"),
  message: z.string().min(1).max(160).describe("中文旁注，说明为什么标出这一处"),
  suggestion: z.string().max(200).optional().describe("针对这一小段的改法，可省略"),
  quote: z
    .string()
    .min(1)
    .max(80)
    .describe("从用户原句逐字复制的连续片段。不要改写，不要翻译，不要自造原句里没有的词。"),
});

export const sentenceSpanSchema = spanDraftSchema.extend({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
});

export const reviewResultSchema = z.object({
  confidence: z.number().min(0).max(1),
  scores: scoresSchema,
  spans: z.array(sentenceSpanSchema).max(8),
  upgrade: userRewriteField(),
  cards: z.array(vocabCardSchema).min(0).max(3),
  rewrite_prompt: z.string().min(1),
  is_mock: z.boolean(),
  style: styleSchema,
});

export const reviewModelSchema = reviewResultSchema.omit({ is_mock: true, spans: true }).extend({
  spans: z.array(spanDraftSchema).max(8),
});

export const reviewRequestSchema = z.object({
  question: questionCoreSchema,
  user_sentence: z.string().min(1).max(500),
});

export type TopicDomain = z.infer<typeof topicDomainSchema>;
export type SentenceFunction = z.infer<typeof sentenceFunctionSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionCore = z.infer<typeof questionCoreSchema>;
export type GenerateQuestionRequest = z.infer<
  typeof generateQuestionRequestSchema
>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export type VocabCard = z.infer<typeof vocabCardSchema>;
export type SentenceSpan = z.infer<typeof sentenceSpanSchema>;
export type SpanDraft = z.infer<typeof spanDraftSchema>;

function rewriteWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []).map((word) => {
    const bare = word.replace(/'s$/, "");
    if (bare.length > 4 && bare.endsWith("s") && !bare.endsWith("ss")) {
      return bare.slice(0, -1);
    }
    return bare;
  });
}

function longestCommonWordCount(source: string[], target: string[]): number {
  const dp = Array.from({ length: source.length + 1 }, () =>
    new Uint16Array(target.length + 1),
  );
  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      dp[i][j] =
        source[i - 1] === target[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[source.length][target.length];
}

/** True when an upgrade still reads as the user's sentence, not a replacement template. */
export function isRewriteOfUserSentence(userSentence: string, upgrade: string): boolean {
  const source = rewriteWords(userSentence);
  const target = rewriteWords(upgrade);
  if (source.length === 0 || target.length === 0) return false;
  const shared = longestCommonWordCount(source, target);
  const anchors = source.filter((word) => word.length >= 4);
  const targetSet = new Set(target);
  const anchorHits = anchors.filter((word) => targetSet.has(word)).length;
  const anchorsKept = anchors.length === 0 || anchorHits >= Math.max(1, Math.ceil(anchors.length * 0.4));
  return shared / source.length >= 0.55 && target.length - source.length <= 18 && anchorsKept;
}

export function reviewResultSchemaForSentence(userSentence: string) {
  return reviewResultSchema.superRefine((data, ctx) => {
    if (!isRewriteOfUserSentence(userSentence, data.upgrade)) {
      ctx.addIssue({
        code: "custom",
        path: ["upgrade"],
        message: USER_SENTENCE_REWRITE_RULE,
      });
    }
    const ordered = [...data.spans].sort((a, b) => a.start - b.start);
    for (let index = 0; index < data.spans.length; index += 1) {
      const span = data.spans[index];
      if (span.start < 0 || span.end > userSentence.length || span.end <= span.start) {
        ctx.addIssue({
          code: "custom",
          path: ["spans", index],
          message: "span 的起止必须落在用户原句内部。",
        });
        continue;
      }
      const slice = userSentence.slice(span.start, span.end);
      if (span.quote && span.quote !== slice) {
        ctx.addIssue({
          code: "custom",
          path: ["spans", index, "quote"],
          message: "quote 必须等于原句里 start 到 end 的切片。",
        });
      }
    }
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].start < ordered[index - 1].end) {
        ctx.addIssue({
          code: "custom",
          path: ["spans"],
          message: "标亮区间不能重叠。",
        });
        break;
      }
    }
  });
}

/** Pull suggested length toward ~50 words (framework writing-length rule). */
export function leanSuggestedWords(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const rounded = Math.round(value);
  return rounded >= 45 && rounded <= 55 ? rounded : 50;
}
