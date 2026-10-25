import { Badge } from "@/components/ui/badge";
import type { VocabCard } from "@/lib/schema";

export function VocabCardView({
  card,
  rewrite,
}: {
  card: VocabCard;
  rewrite?: string;
}) {
  return (
    <article className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap gap-1.5">
        <Badge>{card.type === "collocation" ? "词伙" : "句型"}</Badge>
        <Badge variant="outline">academic</Badge>
        <Badge variant="outline">exam safe</Badge>
      </div>
      <p className="text-base font-medium text-foreground">{card.expression}</p>
      <p className="text-sm text-muted-foreground">{card.meaning_zh}</p>
      <dl className="space-y-1.5 text-sm">
        <div>
          <dt className="text-xs text-[var(--text-muted)]">原句</dt>
          <dd className="leading-relaxed text-foreground">{card.source_sentence}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">场景</dt>
          <dd>{card.usage}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">易错点</dt>
          <dd>{card.pitfall}</dd>
        </div>
        {rewrite ? (
          <div>
            <dt className="text-xs text-[var(--text-muted)]">你的重写</dt>
            <dd className="leading-relaxed text-foreground">{rewrite}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
