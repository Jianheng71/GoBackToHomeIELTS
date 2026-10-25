export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Counts sentence-like chunks. A draft with no punctuation still counts as one sentence. */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return Math.max(parts.length, 1);
}

export function normalizeSentence(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function writingIssue(text: string): string | null {
  const words = countWords(text);
  const sentences = countSentences(text);
  if (words === 0) return "请先写 1–2 句英文。";
  if (words < 8) return "再写几个词，凑成完整的 1–2 句。";
  if (words > 80) return "本题只练约 50 词，请缩短后再提交。";
  if (sentences > 3) return "请控制在 1–2 句，不要写成整段。";
  return null;
}

export function rewriteIssue(original: string, rewrite: string): string | null {
  const issue = writingIssue(rewrite);
  if (issue) {
    if (countWords(rewrite) === 0) return "完成重写后才能生成词伙卡。";
    return issue;
  }
  if (normalizeSentence(original) === normalizeSentence(rewrite)) {
    return "重写需要相对原稿有改动。";
  }
  return null;
}
