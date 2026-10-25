import { locateSpans } from "./annotate";
import type { QuestionCore, ReviewResult, SpanDraft } from "./schema";
import { reviewResultSchemaForSentence } from "./schema";

const WORD_MAP: Record<string, string> = {
  good: "beneficial",
  bad: "harmful",
  big: "substantial",
  important: "significant",
  very: "particularly",
};

const TYPOS: Record<string, string> = {
  althogh: "Although",
  recieve: "receive",
  seperate: "separate",
  enviroment: "environment",
  goverment: "government",
  becuase: "because",
  wich: "which",
  thier: "their",
  definately: "definitely",
  benifit: "benefit",
};

const TEMPLATES = [
  "on the one hand",
  "on the other hand",
  "with the development of",
  "every coin has two sides",
  "it is well known",
  "as we all know",
  "last but not least",
  "in conclusion",
  "it may be argued that",
];

function normalizeClause(sentence: string): string {
  return sentence.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "").trim();
}

function finish(sentence: string): string {
  const text = sentence.replace(/\s+/g, " ").trim();
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function replaceWords(
  sentence: string,
  table: Record<string, string>,
  edits: string[],
): string {
  return sentence.replace(/\b[A-Za-z']+\b/g, (word) => {
    const next = table[word.toLowerCase()];
    if (!next || next.toLowerCase() === word.toLowerCase()) return word;
    edits.push(`${word}→${next}`);
    return next;
  });
}

function applyGrammar(sentence: string, edits: string[]): string {
  let next = sentence.replace(/\b(people|they|we|children)\s+is\b/gi, (match) => {
    const replaced = match.replace(/\bis\b/i, "are");
    edits.push(`${match}→${replaced}`);
    return replaced;
  });
  next = next.replace(/\b(he|she|it)\s+are\b/gi, (match) => {
    const replaced = match.replace(/\bare\b/i, "is");
    edits.push(`${match}→${replaced}`);
    return replaced;
  });
  return next;
}

function softenCopula(sentence: string): { text: string; edits: string[] } {
  if (/\b(may|might|could|should|would|can)\b/i.test(sentence)) {
    return { text: sentence, edits: [] };
  }
  if (/\bis\b/i.test(sentence)) {
    return { text: sentence.replace(/\bis\b/i, "may be"), edits: ["is→may be"] };
  }
  if (/\bare\b/i.test(sentence)) {
    return { text: sentence.replace(/\bare\b/i, "may be"), edits: ["are→may be"] };
  }
  return { text: sentence, edits: [] };
}

/** One minimal academic rewrite. The user's clause stays the spine. */
export function mockUpgradeFromUserSentence(userSentence: string): { text: string; edits: string[] } {
  const edits: string[] = [];
  let clause = normalizeClause(userSentence);
  clause = replaceWords(clause, TYPOS, edits);
  clause = applyGrammar(clause, edits);
  const lexical = replaceWords(clause, WORD_MAP, edits);
  const softened = softenCopula(lexical);
  edits.push(...softened.edits);
  clause = softened.text;
  if (edits.length === 0 && !/at least to some extent$/i.test(clause)) {
    clause = `${clause}, at least to some extent`;
    edits.push("加了 to some extent");
  }
  return { text: finish(clause), edits };
}

function collectDrafts(sentence: string): SpanDraft[] {
  const drafts: SpanDraft[] = [];
  for (const match of sentence.matchAll(/\b(people|they|we|children)\s+is\b/gi)) {
    drafts.push({
      kind: "grammar",
      quote: match[0],
      message: "复数主语不宜配 is。",
      suggestion: "改成 are，其余词不动。",
    });
  }
  for (const match of sentence.matchAll(/\b(he|she|it)\s+are\b/gi)) {
    drafts.push({
      kind: "grammar",
      quote: match[0],
      message: "单数主语不宜配 are。",
      suggestion: "改成 is，其余词不动。",
    });
  }
  for (const match of sentence.matchAll(/\b[A-Za-z']+\b/g)) {
    const word = match[0];
    const lower = word.toLowerCase();
    const spelling = TYPOS[lower];
    if (spelling) {
      drafts.push({
        kind: "spelling",
        quote: word,
        message: `拼写应为 ${spelling}。`,
        suggestion: `改成 ${spelling}，其余不动。`,
      });
      continue;
    }
    const upgraded = WORD_MAP[lower];
    if (upgraded) {
      drafts.push({
        kind: "upgrade",
        quote: word,
        message: `「${word}」偏口语，可换成 ${upgraded}。`,
        suggestion: `把 ${word} 改成 ${upgraded}。`,
      });
    }
  }
  if (!/\b(may|might|could|should|would|can)\b/i.test(sentence)) {
    const copula = /\bis\b/.exec(sentence);
    if (copula && copula.index !== undefined) {
      const before = sentence.slice(Math.max(0, copula.index - 16), copula.index);
      if (!/\b(people|they|we|children)\s+$/i.test(before)) {
        drafts.push({
          kind: "upgrade",
          quote: copula[0],
          message: "is 可以收成 may be，原句其他词不动。",
          suggestion: "把这一处 is 改成 may be。",
        });
      }
    }
  }
  return drafts.slice(0, 8);
}

function phraseAround(sentence: string, focus: string): string {
  const words = sentence.replace(/[.!?]/g, "").split(/\s+/).filter(Boolean);
  const index = words.findIndex((word) => word.toLowerCase() === focus.toLowerCase());
  if (index < 0) return words.slice(0, 4).join(" ");
  const start = Math.max(0, index - 2);
  return words.slice(start, index + 1).join(" ");
}

function openingPhrase(sentence: string): string {
  return sentence.replace(/[.!?]/g, "").split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
}

function laterPhrase(sentence: string): string {
  const words = sentence.replace(/[.!?]/g, "").split(/\s+/).filter(Boolean);
  const start = Math.max(0, Math.floor(words.length / 2));
  return words.slice(start, start + 4).join(" ");
}

function topicHit(sentence: string, tag: string): boolean {
  const words = tag
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && word !== "and");
  if (words.length === 0) return false;
  const lower = sentence.toLowerCase();
  return words.every((word) => lower.includes(word));
}

export function mockReview(question: QuestionCore, userSentence: string): ReviewResult {
  const trimmed = userSentence.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const upgraded = mockUpgradeFromUserSentence(trimmed);
  const advancedText = upgraded.text;
  const spans = locateSpans(trimmed, collectDrafts(trimmed));
  const lower = trimmed.toLowerCase();
  const tag = question.topic_tags[0] ?? "the topic";
  const onTopic = topicHit(trimmed, tag);
  const hasLink = /\b(although|because|since|while|however|so|may|should)\b/i.test(trimmed);
  const templateHits = TEMPLATES.filter((item) => lower.includes(item));
  const spelling = spans.filter((span) => span.kind === "spelling");
  const grammar = spans.filter((span) => span.kind === "grammar");
  const upgrades = spans.filter((span) => span.kind === "upgrade");
  const hasClause = /\b(although|because|while|which|that|if)\b/i.test(trimmed);
  const editSummary = upgraded.edits.length > 0 ? upgraded.edits.join("、") : "没有改实词";

  const focus = upgraded.edits.find((edit) => edit.includes("→"))?.split("→")[1] ?? "";
  const expression = focus
    ? phraseAround(advancedText, focus.split(/\s+/).at(-1) ?? focus)
    : openingPhrase(advancedText);
  const cards: ReviewResult["cards"] = [
    {
      type: "collocation",
      expression,
      source_sentence: advancedText,
      meaning_zh: "从你的原句改写里抽出的一小段",
      usage: "对照原句看改了哪几个词",
      pitfall: "不要把这几个词拿去换成别的主题",
      exam_safe: true,
      style: "academic",
    },
  ];
  if (wordCount >= 12) {
    const later = laterPhrase(advancedText);
    if (later.toLowerCase() !== expression.toLowerCase()) {
      cards.push({
        type: "collocation",
        expression: later,
        source_sentence: advancedText,
        meaning_zh: "原句后半段，改写后仍然留着",
        usage: "确认后半句没有被换成新内容",
        pitfall: "复习时先对原句，再看这一小段",
        exam_safe: true,
        style: "academic",
      });
    }
  }

  const raw: ReviewResult = {
    confidence: spelling.length + grammar.length > 0 ? 0.64 : 0.74,
    scores: {
      tr: {
        signal: onTopic && hasLink ? "plus" : onTopic ? "mixed" : "minus",
        judgment: onTopic
          ? "这句扣住了题目，核心意思能看出来。"
          : "这句没有用上题目里的话题，任务回应偏弱。",
        points: [
          onTopic ? `话题「${tag}」在原句里出现了。` : `题目话题是「${tag}」，原句里没有。`,
          hasLink ? "句内有限定或因果，不只是空判断。" : "句内还缺一个理由、结果或限定。",
        ],
        suggestion: onTopic
          ? "保留原句，只把理由写得更贴这道题。"
          : `仍用你的原句，把「${tag}」放进主干，不要另写一句。`,
      },
      cc: {
        signal: templateHits.length >= 2 ? "minus" : templateHits.length === 1 ? "mixed" : hasLink ? "plus" : "mixed",
        judgment:
          templateHits.length > 0
            ? "衔接里有套话，读起来像模板而不是你的句子。"
            : "衔接没有靠模板堆出来。",
        points: [
          templateHits.length > 0
            ? `模板痕迹：${templateHits.join("、")}。`
            : "没有堆砌 on the one hand 这类套话。",
          hasLink ? "连接词是在服务原句的意思。" : "两个意思之间还可以再接自然一点。",
        ],
        suggestion:
          templateHits.length > 0
            ? "删掉套话，用 although 或 because 接上你自己的后半句。"
            : "不必再加套话。要衔接的话，用你已经在用的那个关系。",
      },
      lr: {
        signal: spelling.length > 0 ? "minus" : upgrades.length > 0 ? "mixed" : "plus",
        judgment:
          spelling.length > 0
            ? "有拼写问题，精确度先被这一处拉低。"
            : upgrades.length > 0
              ? "意思清楚，还有几处用词可以再精确。"
              : "用词已经比较稳，没有看出拼写错误。",
        points: [
          spelling.length > 0
            ? `拼写：${spelling.map((span) => span.quote).join("、")}。`
            : "没有看出拼写错误。",
          upgrades.length > 0
            ? `可再精确：${upgrades.map((span) => span.quote).join("、")}。`
            : "没有必须替换的口语词。",
        ],
        suggestion: upgrades[0]?.suggestion ?? spelling[0]?.suggestion ?? "保持原词，不要为了换词另写一句。",
      },
      gra: {
        signal: grammar.length > 0 ? "minus" : hasClause ? "plus" : "mixed",
        judgment:
          grammar.length > 0
            ? "有一处语法不稳，复杂结构先不要加。"
            : hasClause
              ? "从句用上了，而且没有看出主谓错误。"
              : "简单句是通的。从句不是这句的必选项。",
        points: [
          grammar.length > 0
            ? `语法：${grammar.map((span) => span.quote).join("、")}。`
            : "没有看出主谓不一致。",
          hasClause ? "句式不只有一个简单主谓。" : "目前是简单句。写对，比写得花哨更重要。",
        ],
        suggestion: grammar[0]?.suggestion ?? "从句或被动只用在你已经想表达的关系上，用错就不要硬加。",
      },
    },
    spans,
    upgrade: advancedText,
    cards,
    rewrite_prompt: `请基于你的原句重写：保留原意和主要结构，只做必要的学术润色（${editSummary}），不要另写一句。`,
    is_mock: true,
    style: "academic",
  };

  return reviewResultSchemaForSentence(trimmed).parse(raw);
}
