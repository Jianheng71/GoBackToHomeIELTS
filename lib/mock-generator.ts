import { isDuplicate, type RecentQuestion } from "./dedupe";
import type {
  Difficulty,
  GenerateQuestionRequest,
  Question,
  SentenceFunction,
  TopicDomain,
} from "./schema";
import {
  difficultySchema,
  questionSchema,
  sentenceFunctionSchema,
  topicDomainSchema,
} from "./schema";

const TOPIC_POOL: Record<TopicDomain, string[]> = {
  education: [
    "university funding",
    "online learning",
    "exam pressure",
    "vocational training",
    "lifelong learning",
  ],
  technology: [
    "AI and jobs",
    "remote work",
    "data privacy",
    "automation in services",
    "digital literacy",
  ],
  environment: [
    "urban air quality",
    "renewable energy",
    "plastic waste",
    "public transport",
    "climate adaptation",
  ],
  government: [
    "public healthcare",
    "tax policy",
    "immigration rules",
    "welfare reform",
    "infrastructure spending",
  ],
  work: [
    "work-life balance",
    "minimum wage",
    "gig economy",
    "workplace diversity",
    "career mobility",
  ],
  urbanization: [
    "housing affordability",
    "city congestion",
    "suburban sprawl",
    "public space",
    "gentrification",
  ],
  media: [
    "social media influence",
    "news credibility",
    "advertising to children",
    "screen time",
    "digital misinformation",
  ],
  social_equity: [
    "gender pay gap",
    "rural-urban divide",
    "access to education",
    "ageing population",
    "income inequality",
  ],
};

const MEANING_TEMPLATES: Record<string, string[]> = {
  cause_effect: [
    "过度依赖{topic}可能削弱长期竞争力，但适度投入能带来可见效益。",
    "{topic}若缺乏监管，短期增长往往以更高社会成本为代价。",
    "{topic}的扩张往往推高后续成本，这种因果不宜写成必然。",
  ],
  concession: [
    "尽管{topic}带来便利，其潜在风险仍不应被忽视。",
    "虽然{topic}广受推崇，相关代价在部分群体中仍然显著。",
    "即便{topic}改善了效率，受益范围仍然有限。",
  ],
  contrast: [
    "支持{topic}的观点强调效率，反对者则更关注公平与稳定。",
    "{topic}在一线城市成效明显，但在资源薄弱地区效果有限。",
    "{topic}在政策文本里像是进步，日常体验却常常相反。",
  ],
  hedging: [
    "有迹象表明{topic}与生活质量相关，但因果关系仍需谨慎断言。",
    "{topic}或许能改善部分指标，却未必适用于所有社会情境。",
    "目前还不能断言{topic}一定有效，现有观察只支持谨慎判断。",
  ],
  data_description: [
    "近年调查显示，与{topic}相关的态度在年轻群体中趋于分化。",
    "多项研究提示{topic}的影响在不同收入阶层中存在差异。",
    "不同年龄组对{topic}的接受程度并不一致。",
  ],
  opinion: [
    "政府应在{topic}上采取更积极的干预，以平衡效率与公平。",
    "学校有必要在课程中更系统地讨论{topic}带来的伦理问题。",
    "公共讨论应当把{topic}当成优先事项，而不是边缘议题。",
  ],
  problem_solution: [
    "要缓解{topic}带来的压力，政策与教育需要协同推进。",
    "解决{topic}相关争议，透明沟通比单纯限制更具可持续性。",
    "针对{topic}，先公开标准再逐步调整，比一次性禁令更稳妥。",
  ],
  example_generalization: [
    "以{topic}为例，可见技术创新若缺少配套制度，收益难以普惠。",
    "从{topic}的经验看，单一措施往往不足以应对复杂社会挑战。",
    "{topic}说明，缺少配套制度时，单项改革很难扩散。",
  ],
};

const TASK_SUFFIX: Record<string, string> = {
  cause_effect: "请用学术英文写 1–2 句，说明因果关系并控制词数。",
  concession: "请用学术英文写 1–2 句，使用让步结构并保留限定语气。",
  contrast: "请用学术英文写 1–2 句，呈现对比并保持逻辑清晰。",
  hedging: "请用学术英文写 1–2 句，使用 hedging 表达不确定性。",
  data_description: "请用学术英文写 1–2 句，描述趋势或差异，避免编造具体数据。",
  opinion: "请用学术英文写 1–2 句，表达明确立场并保持学术语域。",
  problem_solution: "请用学术英文写 1–2 句，指出问题并给出可行方向。",
  example_generalization: "请用学术英文写 1–2 句，由例子适度概括。",
};

const CONSTRAINTS_BY_FUNCTION: Record<string, string[]> = {
  cause_effect: ["说明因果", "避免绝对化措辞"],
  concession: ["使用让步结构", "保留限定语气"],
  contrast: ["呈现对比", "逻辑衔接自然"],
  hedging: ["使用 hedging", "不改变原意"],
  data_description: ["描述趋势或差异", "不编造具体数字"],
  opinion: ["立场明确", "语域正式"],
  problem_solution: ["问题与对策对应", "表达克制"],
  example_generalization: ["例子与概括匹配", "避免过度推广"],
};

const DIFFICULTY_WORDS: Record<string, number> = {
  easy: 48,
  medium: 50,
  hard: 52,
};

const DIFFICULTY_NOTE: Record<string, string> = {
  easy: "句式可以简单，但保持学术语域。",
  medium: "使用一个从句或限定结构。",
  hard: "信息更完整，可含一个从句，仍只写 1–2 句。",
};

const TOPIC_DOMAINS = topicDomainSchema.options;
const SENTENCE_FUNCTIONS = sentenceFunctionSchema.options;
const DIFFICULTIES = difficultySchema.options;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}

function resolveDomain(
  input: GenerateQuestionRequest["topic_domain"],
): TopicDomain {
  if (input === "random") {
    return pick(TOPIC_DOMAINS);
  }
  return input;
}

function resolveFunction(
  input: GenerateQuestionRequest["function"],
): (typeof SENTENCE_FUNCTIONS)[number] {
  if (input === "random") {
    return pick(SENTENCE_FUNCTIONS);
  }
  return input;
}

function resolveDifficulty(
  input: GenerateQuestionRequest["difficulty"],
): (typeof DIFFICULTIES)[number] {
  if (input === "random") {
    return pick(DIFFICULTIES);
  }
  return input;
}

function composeQuestion(
  req: GenerateQuestionRequest,
  topic_domain: TopicDomain,
  functionKey: SentenceFunction,
  difficulty: Difficulty,
  topicTag: string,
  meaningTemplate: string,
): Question {
  const meaning_zh = meaningTemplate.replace("{topic}", topicTag);
  const extraWeakness =
    req.user_weakness?.includes("hedging") && functionKey !== "hedging"
      ? ["使用 hedging"]
      : [];
  const collocationHint = req.user_weakness?.includes("collocation")
    ? ["使用一个自然学术搭配"]
    : [];
  const constraints = [
    ...CONSTRAINTS_BY_FUNCTION[functionKey],
    ...extraWeakness,
    ...collocationHint,
  ].slice(0, 4);
  const suggested_words = DIFFICULTY_WORDS[difficulty] ?? 50;
  const task_zh = `围绕上述观点，${TASK_SUFFIX[functionKey]}建议总词数约 ${suggested_words} 词。${DIFFICULTY_NOTE[difficulty]}`;

  return questionSchema.parse({
    topic_domain,
    function: functionKey,
    difficulty,
    meaning_zh,
    task_zh,
    constraints: Array.from(new Set(constraints)),
    suggested_words,
    topic_tags: [topicTag],
    exam_safe: true,
    style: "academic" as const,
    is_mock: true,
  });
}

function candidateSpace(req: GenerateQuestionRequest): Array<{
  domain: TopicDomain;
  functionKey: SentenceFunction;
  difficulty: Difficulty;
  topicTag: string;
  template: string;
}> {
  const domains =
    req.topic_domain === "random" ? shuffle(TOPIC_DOMAINS) : [req.topic_domain];
  const functions =
    req.function === "random" ? shuffle(SENTENCE_FUNCTIONS) : [req.function];
  const difficulties =
    req.difficulty === "random" ? shuffle(DIFFICULTIES) : [req.difficulty];
  const space: Array<{
    domain: TopicDomain;
    functionKey: SentenceFunction;
    difficulty: Difficulty;
    topicTag: string;
    template: string;
  }> = [];
  for (const domain of domains) {
    for (const functionKey of functions) {
      for (const topicTag of shuffle(TOPIC_POOL[domain])) {
        for (const template of shuffle(MEANING_TEMPLATES[functionKey])) {
          space.push({
            domain,
            functionKey,
            difficulty: pick(difficulties),
            topicTag,
            template,
          });
        }
      }
    }
  }
  return shuffle(space);
}

/**
 * Programmatic mock. Returns null when every composition collides with `recent`.
 * Not a fixed question bank: order is shuffled on each call.
 */
export function mockGenerateUnique(
  req: GenerateQuestionRequest,
): Question | null {
  const recent = (req.recent_questions ?? []) as RecentQuestion[];
  for (const candidate of candidateSpace(req)) {
    try {
      const question = composeQuestion(
        req,
        candidate.domain,
        candidate.functionKey,
        candidate.difficulty,
        candidate.topicTag,
        candidate.template,
      );
      if (!isDuplicate(question, recent)) return question;
    } catch {
      continue;
    }
  }
  return null;
}

/** Same as `mockGenerateUnique`, or one unrestricted composition if the pool is exhausted. */
export function mockGenerateQuestion(req: GenerateQuestionRequest): Question {
  return (
    mockGenerateUnique(req) ??
    composeQuestion(
      req,
      resolveDomain(req.topic_domain),
      resolveFunction(req.function),
      resolveDifficulty(req.difficulty),
      pick(TOPIC_POOL[resolveDomain(req.topic_domain)]),
      pick(MEANING_TEMPLATES[resolveFunction(req.function)]),
    )
  );
}
