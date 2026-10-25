import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SurfaceCard } from "@/components/SurfaceCard";

export default function HomePage() {
  return (
    <AppShell
      title="紫光书房"
      subtitle="句子级雅思学术写作训练 · AI 出题 → 你写英文 → 稍后复习"
    >
      <SurfaceCard className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          每次练习只写 <strong className="text-[var(--text-primary)]">1–2 句</strong>{" "}
          英文（约 50 词）。不做整篇作文批改，不做分享卡导出。
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/practice"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--glow-mid)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
          >
            开始练习
          </Link>
          <Link
            href="/review"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--border-quiet)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--glow-soft)]"
          >
            复习词伙
          </Link>
          <Link
            href="/progress"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--border-quiet)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--glow-soft)]"
          >
            查看进度
          </Link>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          无 API Key 时接口返回演示数据（<code className="text-[var(--text-secondary)]">is_mock: true</code>）。
        </p>
      </SurfaceCard>
    </AppShell>
  );
}
