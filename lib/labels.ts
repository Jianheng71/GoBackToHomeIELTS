import type { Difficulty, SentenceFunction, TopicDomain } from "./schema";

export const DOMAIN_OPTIONS: { value: TopicDomain | "random"; label: string }[] =
  [
    { value: "random", label: "全部随机" },
    { value: "education", label: "教育" },
    { value: "technology", label: "科技" },
    { value: "environment", label: "环境" },
    { value: "government", label: "政府" },
    { value: "work", label: "工作" },
    { value: "urbanization", label: "城市化" },
    { value: "media", label: "媒体" },
    { value: "social_equity", label: "社会公平" },
  ];

export const FUNCTION_OPTIONS: {
  value: SentenceFunction | "random";
  label: string;
}[] = [
  { value: "random", label: "全部随机" },
  { value: "cause_effect", label: "因果" },
  { value: "concession", label: "让步" },
  { value: "contrast", label: "对比" },
  { value: "hedging", label: "限定语气" },
  { value: "data_description", label: "数据描述" },
  { value: "opinion", label: "观点" },
  { value: "problem_solution", label: "问题与对策" },
  { value: "example_generalization", label: "例证概括" },
];

export const DIFFICULTY_OPTIONS: {
  value: Difficulty | "random";
  label: string;
}[] = [
  { value: "random", label: "全部随机" },
  { value: "easy", label: "易" },
  { value: "medium", label: "中" },
  { value: "hard", label: "难" },
];

export const DOMAIN_LABEL: Record<TopicDomain, string> = {
  education: "教育",
  technology: "科技",
  environment: "环境",
  government: "政府",
  work: "工作",
  urbanization: "城市化",
  media: "媒体",
  social_equity: "社会公平",
};

export const FUNCTION_LABEL: Record<SentenceFunction, string> = {
  cause_effect: "因果",
  concession: "让步",
  contrast: "对比",
  hedging: "限定语气",
  data_description: "数据描述",
  opinion: "观点",
  problem_solution: "问题与对策",
  example_generalization: "例证概括",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "易",
  medium: "中",
  hard: "难",
};

export const ANALYSIS_DIMENSIONS = [
  { key: "tr", label: "TR", title: "任务回应" },
  { key: "cc", label: "CC", title: "衔接连贯" },
  { key: "lr", label: "LR", title: "词汇资源" },
  { key: "gra", label: "GRA", title: "语法范围与准确" },
] as const;

export const SPAN_KIND_LABEL = {
  upgrade: "可升级处",
  grammar: "语法错误",
  spelling: "拼写错误",
} as const;

export const SIGNAL_LABEL = {
  plus: "加分",
  mixed: "有得失",
  minus: "有扣分",
} as const;
