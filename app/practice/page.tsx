import { AppShell } from "@/components/AppShell";
import { PracticeLoop } from "@/components/practice/PracticeLoop";

export default function PracticePage() {
  return (
    <AppShell
      title="练习"
      subtitle="1–2 句英文，大约 50 词。评阅之后必须重写，才会生成词伙卡。"
      padBottom
    >
      <PracticeLoop />
    </AppShell>
  );
}
