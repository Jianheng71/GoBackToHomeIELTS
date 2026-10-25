"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import {
  ANALYSIS_DIMENSIONS,
  DIFFICULTY_LABEL,
  DIFFICULTY_OPTIONS,
  DOMAIN_LABEL,
  DOMAIN_OPTIONS,
  FUNCTION_LABEL,
  FUNCTION_OPTIONS,
  SIGNAL_LABEL,
} from "@/lib/labels";
import { toRecent } from "@/lib/dedupe";
import { fetchQuestion, fetchReview, type GenerateQuestionInput } from "@/lib/practice-api";
import type { Question, ReviewResult } from "@/lib/schema";
import {
  readRecentQuestions,
  readSettings,
  recordReviewSubmitted,
  recordSentenceCompleted,
  saveCardsAfterRewrite,
  writeRecentQuestions,
  writeSettings,
  type StoredCard,
} from "@/lib/storage";
import { countSentences, countWords, rewriteIssue, writingIssue } from "@/lib/text-metrics";
import { HighlightedSentence } from "./HighlightedSentence";
import { VocabCardView } from "./VocabCardView";

type Phase =
  | "loading"
  | "writing"
  | "reviewing"
  | "rewrite"
  | "saving"
  | "done"
  | "duplicate"
  | "error";

type Filters = {
  topic_domain: NonNullable<GenerateQuestionInput["topic_domain"]>;
  function: NonNullable<GenerateQuestionInput["function"]>;
  difficulty: NonNullable<GenerateQuestionInput["difficulty"]>;
};

const selectClass =
  "h-9 w-full rounded-md border border-border bg-[var(--bg-elevated)] px-2 text-sm text-foreground [color-scheme:dark]";

export function PracticeLoop() {
  const filtersRef = useRef<Filters>({
    topic_domain: "random",
    function: "random",
    difficulty: "random",
  });
  const recentRef = useRef<NonNullable<GenerateQuestionInput["recent_questions"]>>(
    [],
  );
  const [filters, setFilters] = useState<Filters>(filtersRef.current);
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<Question | null>(null);
  const [draft, setDraft] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [rewrite, setRewrite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<StoredCard[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadQuestion = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setReview(null);
    setDraft("");
    setRewrite("");
    setMinted([]);
    setDrawerOpen(false);
    const current = filtersRef.current;
    try {
      const outcome = await fetchQuestion({
        topic_domain: current.topic_domain,
        function: current.function,
        difficulty: current.difficulty,
        recent_questions: recentRef.current.slice(0, 50),
      });
      if (outcome.kind === "duplicate") {
        setQuestion(null);
        setPhase("duplicate");
        setError(outcome.message);
        return;
      }
      const next = outcome.question;
      recentRef.current = [toRecent(next), ...recentRef.current].slice(0, 50);
      writeRecentQuestions(recentRef.current);
      setQuestion(next);
      setPhase("writing");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "题目生成失败，请重试");
    }
  }, []);

  useEffect(() => {
    const saved = readSettings();
    filtersRef.current = saved;
    setFilters(saved);
    recentRef.current = readRecentQuestions();
    void loadQuestion();
  }, [loadQuestion]);

  useEffect(() => {
    const sync = () => {
      const saved = readSettings();
      filtersRef.current = saved;
      setFilters(saved);
      recentRef.current = readRecentQuestions();
    };
    window.addEventListener("gbth-settings-updated", sync);
    return () => window.removeEventListener("gbth-settings-updated", sync);
  }, []);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    const next = { ...filters, [key]: value };
    filtersRef.current = next;
    setFilters(next);
    writeSettings({ ...readSettings(), ...next });
  }

  function requestNewQuestion(force = false) {
    const dirty =
      (phase === "writing" && draft.trim().length > 0) ||
      phase === "rewrite" ||
      phase === "reviewing";
    if (!force && dirty) {
      const ok = window.confirm(
        "换一题会丢弃当前草稿和未保存的评阅。已经落卡的内容会保留。",
      );
      if (!ok) return;
    }
    void loadQuestion();
  }

  async function submitDraft() {
    if (!question) return;
    const issue = writingIssue(draft);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    setPhase("reviewing");
    try {
      const result = await fetchReview({
        question,
        user_sentence: draft.trim(),
      });
      setReview(result);
      recordReviewSubmitted();
      setPhase("rewrite");
    } catch (err) {
      setPhase("writing");
      setError(err instanceof Error ? err.message : "评阅失败，请再试一次");
    }
  }

  async function submitRewrite() {
    if (!question || !review) return;
    const issue = rewriteIssue(draft, rewrite);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    setPhase("saving");
    try {
      const saved = saveCardsAfterRewrite({
        question,
        original: draft,
        rewrite,
        review,
      });
      setMinted(saved);
      recordSentenceCompleted();
      setPhase("done");
      setDrawerOpen(true);
    } catch (err) {
      setPhase("rewrite");
      setError(err instanceof Error ? err.message : "词伙卡保存失败");
    }
  }

  const countingRewrite =
    phase === "rewrite" || phase === "done" || phase === "saving";
  const countedText = countingRewrite ? rewrite : draft;
  const words = countWords(countedText);
  const sentences = countSentences(countedText);
  const target = question?.suggested_words ?? 50;
  const wordTone =
    words === 0
      ? "text-[var(--text-muted)]"
      : Math.abs(words - target) <= 15
        ? "text-[var(--ok)]"
        : "text-[var(--warn)]";
  const rewriteBlocker = review ? rewriteIssue(draft, rewrite) : "完成重写后才能生成词伙卡。";
  const busy = phase === "loading" || phase === "reviewing" || phase === "saving";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          话题域
          <select
            className={selectClass}
            value={filters.topic_domain}
            onChange={(event) =>
              updateFilter(
                "topic_domain",
                event.target.value as Filters["topic_domain"],
              )
            }
          >
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          句子功能
          <select
            className={selectClass}
            value={filters.function}
            onChange={(event) =>
              updateFilter("function", event.target.value as Filters["function"])
            }
          >
            {FUNCTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          难度
          <select
            className={selectClass}
            value={filters.difficulty}
            onChange={(event) =>
              updateFilter(
                "difficulty",
                event.target.value as Filters["difficulty"],
              )
            }
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        筛选在下一次出题时生效，并会记在设置里。三项都选「全部随机」即随机出题。
      </p>

      {phase === "loading" ? (
        <Card>
          <CardHeader>
            <CardTitle>正在出题</CardTitle>
            <CardDescription>题目只来自出题接口，请稍候。</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {phase === "error" || phase === "duplicate" ? (
        <Card>
          <CardHeader>
            <CardTitle>{phase === "duplicate" ? "换一题" : "出题没有成功"}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {question && phase !== "loading" && phase !== "error" && phase !== "duplicate" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{DOMAIN_LABEL[question.topic_domain]}</Badge>
              <Badge variant="outline">{FUNCTION_LABEL[question.function]}</Badge>
              <Badge variant="outline">{DIFFICULTY_LABEL[question.difficulty]}</Badge>
              {question.is_mock ? <Badge>演示题</Badge> : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                disabled={busy}
                onClick={() => requestNewQuestion()}
              >
                换一题
              </Button>
            </div>
            <CardTitle>{question.meaning_zh}</CardTitle>
            <CardDescription>{question.task_zh}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {question.constraints.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {question && phase !== "loading" && phase !== "error" && phase !== "duplicate" ? (
        <div className="space-y-2">
          <label className="block text-sm text-muted-foreground" htmlFor="draft">
            你的英文（1–2 句）
          </label>
          <Textarea
            id="draft"
            value={draft}
            disabled={phase !== "writing"}
            placeholder="Write one or two academic sentences."
            className="min-h-[38vh]"
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
          />
        </div>
      ) : null}

      {review && (phase === "rewrite" || phase === "saving" || phase === "done") ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-1.5">
              <CardTitle>评阅</CardTitle>
              {review.is_mock ? <Badge>演示评阅</Badge> : null}
              {review.confidence < 0.6 ? <Badge variant="outline">建议仅供参考</Badge> : null}
            </div>
            <CardDescription>
              TR / CC / LR / GRA 同等看待这 1–2 句。不是雅思分数。词伙在重写完成前不会保存。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-3 sm:grid-cols-2">
              {ANALYSIS_DIMENSIONS.map((dimension) => {
                const item = review.scores[dimension.key];
                return (
                  <li
                    key={dimension.key}
                    className="rounded-lg border border-[var(--border-quiet)] bg-[var(--bg-elevated)]/50 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {dimension.label} {dimension.title}
                      </span>
                      <span className="font-mono text-xs text-[var(--glow-soft)]">
                        {SIGNAL_LABEL[item.signal]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{item.judgment}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                      可改：{item.suggestion}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div>
              <p className="mb-2 text-xs text-[var(--text-muted)]">你的原句</p>
              <HighlightedSentence text={draft.trim()} spans={review.spans} />
            </div>
            <div className="rounded-lg border border-[var(--border-quiet)] p-3">
              <p className="text-xs text-[var(--text-muted)]">基于你的原句 · 进阶</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">只做最小修改，不另写新句子。</p>
              <p className="mt-2 leading-relaxed text-foreground">{review.upgrade}</p>
            </div>
            <div className="rounded-lg border border-[var(--border-quiet)] bg-[var(--bg-elevated)]/50 p-3">
              <p className="text-xs text-[var(--text-muted)]">
                {review.is_mock ? "独立示范 · 演示句" : "AI 独立示范 · 高阶学术表达"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                独立回应题目，示范 TR / CC / LR / GRA；参考高分表达，不代表分数承诺。
              </p>
              <p className="mt-2 leading-relaxed text-foreground">{review.model_sentence}</p>
            </div>
            {review.cards.length > 0 && phase !== "done" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">词伙</p>
                <p className="text-xs text-muted-foreground">重写完成前不会保存。</p>
                {review.cards.map((card) => (
                  <VocabCardView key={`${card.expression}-${card.meaning_zh}`} card={card} />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {review && (phase === "rewrite" || phase === "saving" || phase === "done") ? (
        <div className="space-y-2">
          <label className="block text-sm text-muted-foreground" htmlFor="rewrite">
            强制重写
          </label>
          <p className="text-sm text-muted-foreground">{review.rewrite_prompt}</p>
          <Textarea
            id="rewrite"
            value={rewrite}
            disabled={phase !== "rewrite"}
            placeholder="Rewrite in your own academic English."
            className="min-h-[28vh]"
            onChange={(event) => {
              setRewrite(event.target.value);
              if (error) setError(null);
            }}
          />
          {phase === "rewrite" && rewriteBlocker ? (
            <p className="text-sm text-[var(--warn)]">{rewriteBlocker}</p>
          ) : null}
        </div>
      ) : null}

      {phase === "done" ? (
        <Card>
          <CardHeader>
            <CardTitle>已保存 {minted.length} 张词伙卡</CardTitle>
            <CardDescription>写在这台浏览器里，复习页可以查看。间隔复习稍后再接。</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(true)}>
              查看本次词伙卡
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/review">打开复习页</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {error && phase !== "error" ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="border-t border-border bg-[var(--bg-void)]/95 px-4 py-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8">
          <p className={`mb-2 font-mono text-xs ${wordTone}`} aria-live="polite">
            {question
              ? `${countingRewrite ? "重写" : "草稿"}词数 ${words} / 建议 ${target} · 句子 ${sentences}（目标 1–2 句）`
              : "等待题目"}
          </p>
          {phase === "writing" || phase === "reviewing" ? (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={phase !== "writing" || !question}
              onClick={() => void submitDraft()}
            >
              {phase === "reviewing" ? "正在评阅" : "提交评阅"}
            </Button>
          ) : null}
          {phase === "rewrite" || phase === "saving" ? (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={phase !== "rewrite" || Boolean(rewriteBlocker)}
              onClick={() => void submitRewrite()}
            >
              {phase === "saving" ? "正在保存" : "完成重写并生成词伙卡"}
            </Button>
          ) : null}
          {phase === "done" ? (
            <Button type="button" size="lg" className="w-full" onClick={() => requestNewQuestion(true)}>
              再练一题
            </Button>
          ) : null}
          {phase === "loading" || phase === "error" || phase === "duplicate" ? (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={phase === "loading"}
              onClick={() => requestNewQuestion(true)}
            >
              {phase === "loading" ? "正在出题" : phase === "duplicate" ? "换一题" : "重试出题"}
            </Button>
          ) : null}
        </div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>本次词伙卡</DrawerTitle>
            <DrawerDescription>
              {minted.length} 张 · style=academic · 已写入本机
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 overflow-y-auto px-4 pb-8">
            {minted.map((card) => (
              <VocabCardView key={card.id} card={card} rewrite={card.user_rewrite} />
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
