import { AppShell } from "@/components/AppShell";
import { ProgressPanel } from "@/components/progress/ProgressPanel";

export default function ProgressPage() {
  return (
    <AppShell title="进度" subtitle="完成句数、重写和复习记录。不显示雅思分数。">
      <ProgressPanel />
    </AppShell>
  );
}
