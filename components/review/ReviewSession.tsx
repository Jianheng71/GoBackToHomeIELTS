"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { gradeStoredCard, readStoredCards, type StoredCard } from "@/lib/storage";
import { isDue, type SuperMemoGrade } from "@/lib/srs";
import { countWords } from "@/lib/text-metrics";

type Mode = "cloze" | "rewrite" | "task2";

const MODES: { id: Mode; label: string }[] = [
  { id: "cloze", label: "挖空" },
  { id: "rewrite", label: "再写一句" },
  { id: "task2", label: "是否适合 Task 2" },
];

type GradeResult = {
  grade: SuperMemoGrade;
  detail: string;
  dueLabel: string;
  interval: number;
};

export function ReviewSession() {
  const [cards, setCards] = useState<StoredCard[] | null>(null);
  const [mode, setMode] = useState<Mode>("cloze");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setCards(readStoredCards());
    refresh();
    window.addEventListener("gbth-cards-updated", refresh);
    return () => window.removeEventListener("gbth-cards-updated", refresh);
  }, []);

  const due = useMemo(
    () =>
      (cards ?? [])
        .filter((card) => isDue(card.srs))
        .sort((left, right) => dueTime(left) - dueTime(right)),
    [cards],
  );
  const current = lockedId
    ? (cards ?? []).find((card) => card.id === lockedId) ?? null
    : due[0] ?? null;

  function resetPrompt() {
    setAnswer("");
    setResult(null);
    setError(null);
    setLockedId(null);
  }

  function commit(card: StoredCard, grade: SuperMemoGrade, detail: string) {
    setLockedId(card.id);
    try {
      const updated = gradeStoredCard(card.id, grade);
      const dueDate = updated.srs.dueDate
        ? new Date(updated.srs.dueDate).toLocaleString("zh-CN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "未排期";
      setResult({
        grade,
        detail,
        dueLabel: dueDate,
        interval: updated.srs.interval,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "复习记录没有保存");
    }
  }

  if (cards === null) {
    return <p className="text-sm text-muted-foreground">正在读取复习队列。</p>;
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>还没有可复习的卡片</CardTitle>
          <CardDescription>先在练习页完成重写，词伙卡会出现在这里，并立刻到期。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/practice">去练习</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!current) {
    const nextDue = [...cards].sort((left, right) => dueTime(left) - dueTime(right))[0];
    return (
      <Card>
        <CardHeader>
          <CardTitle>今天的复习做完了</CardTitle>
          <CardDescription>
            {nextDue?.srs.dueDate
              ? `下一张大约在 ${new Date(nextDue.srs.dueDate).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}。`
              : "新卡片会在落卡后进入队列。"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const blanked = clozeSentence(current.source_sentence, current.expression);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">到期 {due.length}</Badge>
        <Badge variant="outline">SM-2</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={mode === item.id ? "default" : "outline"}
            onClick={() => {
              setMode(item.id);
              resetPrompt();
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{MODES.find((item) => item.id === mode)?.label}</CardTitle>
          <CardDescription>{current.meaning_zh}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === "cloze" ? (
            <>
              <p className="text-base leading-relaxed text-foreground">{blanked}</p>
              <label className="block text-sm text-muted-foreground" htmlFor="cloze-answer">
                填上挖掉的表达
              </label>
              <Textarea
                id="cloze-answer"
                value={answer}
                disabled={Boolean(result)}
                className="min-h-[96px]"
                onChange={(event) => setAnswer(event.target.value)}
              />
              <Button
                type="button"
                disabled={Boolean(result)}
                onClick={() =>
                  commit(
                    current,
                    gradeCloze(answer, current.expression),
                    `目标表达：${current.expression}`,
                  )
                }
              >
                核对并排期
              </Button>
            </>
          ) : null}

          {mode === "rewrite" ? (
            <>
              <p className="text-sm text-muted-foreground">
                用学术英文再写 1–2 句，并包含{" "}
                <span className="text-foreground">{current.expression}</span>。
              </p>
              <Textarea
                id="rewrite-answer"
                value={answer}
                disabled={Boolean(result)}
                className="min-h-[120px]"
                placeholder="Write one or two sentences."
                onChange={(event) => setAnswer(event.target.value)}
              />
              <Button
                type="button"
                disabled={Boolean(result)}
                onClick={() =>
                  commit(
                    current,
                    gradeRewrite(answer, current.expression),
                    `参考原句：${current.source_sentence}`,
                  )
                }
              >
                核对并排期
              </Button>
            </>
          ) : null}

          {mode === "task2" ? (
            <>
              <p className="leading-relaxed text-foreground">{current.source_sentence}</p>
              <p className="text-sm text-muted-foreground">
                表达「{current.expression}」适合放进雅思 Task 2 学术写作吗？
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(result)}
                  onClick={() => commit(current, gradeTask2(current, true), task2Detail(current))}
                >
                  适合
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(result)}
                  onClick={() => commit(current, gradeTask2(current, false), task2Detail(current))}
                >
                  不适合
                </Button>
              </div>
            </>
          ) : null}

          {result ? (
            <div className="space-y-2 rounded-lg border border-border bg-[var(--bg-elevated)] p-3 text-sm">
              <p className="text-foreground">
                本次记分 {result.grade} / 5 · 间隔 {result.interval} 天 · 下次 {result.dueLabel}
              </p>
              <p className="text-muted-foreground">{result.detail}</p>
              <Button type="button" variant="secondary" onClick={resetPrompt}>
                {due.length > 0 ? "下一张" : "完成这张"}
              </Button>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function dueTime(card: StoredCard): number {
  return card.srs.dueDate ? new Date(card.srs.dueDate).getTime() : 0;
}

function clozeSentence(sentence: string, expression: string): string {
  const index = sentence.toLowerCase().indexOf(expression.toLowerCase());
  if (index < 0) return `______（${sentence}）`;
  return `${sentence.slice(0, index)}______${sentence.slice(index + expression.length)}`;
}

function gradeCloze(answer: string, expression: string): SuperMemoGrade {
  const left = normalize(answer);
  const right = normalize(expression);
  if (!left) return 0;
  if (left === right) return 5;
  if (left.includes(right) || right.includes(left)) return 4;
  return 1;
}

function gradeRewrite(answer: string, expression: string): SuperMemoGrade {
  const hasExpression = answer.toLowerCase().includes(expression.toLowerCase());
  const words = countWords(answer);
  if (hasExpression && words >= 8) return 5;
  if (hasExpression) return 3;
  if (words >= 8) return 2;
  return 1;
}

function expectsTask2(card: StoredCard): boolean {
  return card.exam_safe && card.style === "academic";
}

function gradeTask2(card: StoredCard, saidYes: boolean): SuperMemoGrade {
  return saidYes === expectsTask2(card) ? 5 : 1;
}

function task2Detail(card: StoredCard): string {
  return expectsTask2(card)
    ? "这张卡标记为 academic 且 exam safe，适合 Task 2。"
    : "这张卡没有同时标成 academic 与 exam safe，不适合直接放进 Task 2。";
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
