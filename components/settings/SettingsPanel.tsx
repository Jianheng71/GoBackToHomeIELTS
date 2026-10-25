"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DIFFICULTY_OPTIONS,
  DOMAIN_OPTIONS,
  FUNCTION_OPTIONS,
} from "@/lib/labels";
import {
  clearLocalData,
  defaultPracticeSettings,
  readSettings,
  writeSettings,
  type PracticeSettings,
} from "@/lib/storage";

const selectClass =
  "h-9 w-full rounded-md border border-border bg-[var(--bg-elevated)] px-2 text-sm text-foreground [color-scheme:dark]";

export function SettingsPanel() {
  const [settings, setSettings] = useState<PracticeSettings>(defaultPracticeSettings);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const refresh = () => setSettings(readSettings());
    refresh();
    window.addEventListener("gbth-settings-updated", refresh);
    return () => window.removeEventListener("gbth-settings-updated", refresh);
  }, []);

  function update<K extends keyof PracticeSettings>(key: K, value: PracticeSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    writeSettings(next);
    setCleared(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>出题范围</CardTitle>
          <CardDescription>与练习页共用。下一次出题会按这里的选择。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            话题域
            <select
              className={selectClass}
              value={settings.topic_domain}
              onChange={(event) =>
                update("topic_domain", event.target.value as PracticeSettings["topic_domain"])
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
              value={settings.function}
              onChange={(event) =>
                update("function", event.target.value as PracticeSettings["function"])
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
              value={settings.difficulty}
              onChange={(event) =>
                update("difficulty", event.target.value as PracticeSettings["difficulty"])
              }
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = {
                ...settings,
                topic_domain: "random" as const,
                function: "random" as const,
                difficulty: "random" as const,
              };
              setSettings(next);
              writeSettings(next);
            }}
          >
            全部随机
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>动态效果</CardTitle>
          <CardDescription>写作页背景本来就最慢。这里可以让全站背景停住。</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.reduce_motion}
              onChange={(event) => update("reduce_motion", event.target.checked)}
            />
            <span>减少动态效果。系统开启「减少动态效果」或低配设备时也会停住。</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API</CardTitle>
          <CardDescription>密钥只放在服务器环境变量里，不会写进浏览器。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>在项目根目录复制 `.env.example` 为 `.env.local`：</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <code className="text-foreground">OPENAI_API_KEY</code> 兼容网关的密钥
            </li>
            <li>
              <code className="text-foreground">OPENAI_BASE_URL</code> 可选，兼容端点
            </li>
            <li>
              <code className="text-foreground">OPENAI_MODEL</code> 可选，默认 gpt-4o-mini
            </li>
          </ul>
          <p>Key 留空时，出题和评阅走程序化演示数据。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>声明</CardTitle>
          <CardDescription>学习工具说明。练习页不再重复这段文字。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            非官方学习工具，与任何明星、工作室、媒体机构无关联；不使用其肖像、语录、歌词或原句。
          </p>
          <p>与《解解》无关。题目和反馈只用抽象的学术话题。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>本机数据</CardTitle>
          <CardDescription>清除词伙卡、进度、出题偏好和最近 50 题记录。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              const ok = window.confirm("清除这台浏览器里的练习数据？此操作不能撤销。");
              if (!ok) return;
              clearLocalData();
              setSettings(defaultPracticeSettings);
              setCleared(true);
            }}
          >
            清除本地数据
          </Button>
          {cleared ? <p className="text-sm text-[var(--ok)]">已清除。</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
