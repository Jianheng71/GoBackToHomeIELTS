"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRate, summarizeProgress, type ProgressSummary } from "@/lib/progress";
import { readProgress, readStoredCards } from "@/lib/storage";

export function ProgressPanel() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSummary(summarizeProgress(readProgress(), readStoredCards()));
    };
    refresh();
    window.addEventListener("gbth-progress-updated", refresh);
    window.addEventListener("gbth-cards-updated", refresh);
    return () => {
      window.removeEventListener("gbth-progress-updated", refresh);
      window.removeEventListener("gbth-cards-updated", refresh);
    };
  }, []);

  if (!summary) {
    return <p className="text-sm text-muted-foreground">正在读取本机进度。</p>;
  }

  const empty =
    summary.sentencesCompleted === 0 &&
    summary.reviewsSubmitted === 0 &&
    summary.cardsTotal === 0;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        只统计你在这台浏览器里的练习次数，不估算雅思分数。
      </p>
      {empty ? (
        <Card>
          <CardHeader>
            <CardTitle>还没有练习记录</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/practice">去写一句</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="完成句数" value={String(summary.sentencesCompleted)} />
        <Stat label="已提交评阅" value={String(summary.reviewsSubmitted)} />
        <Stat label="重写完成率" value={formatRate(summary.rewriteRate)} />
        <Stat label="复习完成率" value={formatRate(summary.reviewRate)} />
        <Stat label="到期卡片" value={String(summary.cardsDue)} />
        <Stat label="复习次数" value={String(summary.srsReviewsCompleted)} />
        <Stat label="词伙卡" value={String(summary.cardsTotal)} />
        <Stat label="连续练习" value={`${summary.streakDays} 天`} />
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        重写完成率 = 完成重写的句子 / 已提交评阅。复习完成率 = 至少复习过一次的卡片 / 全部卡片。
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xl font-semibold">{value}</CardContent>
    </Card>
  );
}
