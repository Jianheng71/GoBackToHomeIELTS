"use client";

import { SPAN_KIND_LABEL } from "@/lib/labels";
import type { SentenceSpan } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const kindClass: Record<SentenceSpan["kind"], string> = {
  upgrade:
    "rounded-sm bg-[var(--glow-deep)] text-[var(--text-primary)] underline decoration-[var(--glow-soft)] decoration-2 underline-offset-2",
  grammar:
    "rounded-sm bg-[color:color-mix(in_srgb,var(--warn)_28%,transparent)] text-[var(--text-primary)] underline decoration-[var(--warn)] decoration-2 underline-offset-2",
  spelling:
    "rounded-sm bg-[color:color-mix(in_srgb,var(--danger)_22%,transparent)] text-[var(--text-primary)] underline decoration-wavy decoration-[var(--danger)] underline-offset-[3px]",
};

export function HighlightedSentence({
  text,
  spans,
}: {
  text: string;
  spans: SentenceSpan[];
}) {
  const ordered = [...spans]
    .filter((span) => span.start >= 0 && span.end > span.start && span.end <= text.length)
    .sort((a, b) => a.start - b.start);
  const parts: Array<{ text: string; span?: SentenceSpan }> = [];
  let cursor = 0;
  for (const span of ordered) {
    if (span.start < cursor) continue;
    if (span.start > cursor) parts.push({ text: text.slice(cursor, span.start) });
    parts.push({ text: text.slice(span.start, span.end), span });
    cursor = span.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });

  return (
    <div className="space-y-3">
      <TooltipProvider delayDuration={200}>
        <p className="text-base leading-relaxed text-foreground">
          {parts.map((part, index) =>
            part.span ? (
              <Tooltip key={`${part.span.kind}-${part.span.start}`}>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    data-kind={part.span.kind}
                    data-quote={part.span.quote}
                    className={cn("cursor-help outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]", kindClass[part.span.kind])}
                  >
                    {part.text}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{SPAN_KIND_LABEL[part.span.kind]}</p>
                  <p className="mt-1">{part.span.message}</p>
                  {part.span.suggestion ? (
                    <p className="mt-1 text-[var(--text-secondary)]">可改：{part.span.suggestion}</p>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            ) : (
              <span key={`plain-${index}`}>{part.text}</span>
            ),
          )}
        </p>
      </TooltipProvider>
      <ul className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
        {(Object.keys(SPAN_KIND_LABEL) as SentenceSpan["kind"][]).map((kind) => (
          <li key={kind} className="inline-flex items-center gap-1">
            <span className={cn("inline-block h-2 w-4", kindClass[kind])} />
            {SPAN_KIND_LABEL[kind]}
          </li>
        ))}
      </ul>
      {ordered.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {ordered.map((span) => (
            <li key={`${span.kind}-${span.start}`}>
              <span className="text-foreground">{SPAN_KIND_LABEL[span.kind]}</span>
              {" 「"}
              {span.quote}
              {"」 "}
              {span.message}
              {span.suggestion ? ` 可改：${span.suggestion}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">这句里没有标出拼写、语法或可升级片段。</p>
      )}
    </div>
  );
}
