import { AppShell } from "@/components/AppShell";
import { ReviewSession } from "@/components/review/ReviewSession";
import { SavedCardList } from "@/components/review/SavedCardList";

export default function ReviewPage() {
  return (
    <AppShell
      title="复习"
      subtitle="到期卡片按简化 SM-2 排期。可选挖空、再写一句，或判断是否适合 Task 2。"
    >
      <div className="space-y-8">
        <ReviewSession />
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">全部词伙卡</h2>
          <SavedCardList />
        </section>
      </div>
    </AppShell>
  );
}
