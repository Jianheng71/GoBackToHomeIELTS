"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VocabCardView } from "@/components/practice/VocabCardView";
import { Button } from "@/components/ui/button";
import { readStoredCards, type StoredCard } from "@/lib/storage";

export function SavedCardList() {
  const [cards, setCards] = useState<StoredCard[] | null>(null);

  useEffect(() => {
    const refresh = () => {
      setCards([...readStoredCards()].reverse());
    };
    refresh();
    window.addEventListener("gbth-cards-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("gbth-cards-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (cards === null) {
    return <p className="text-sm text-muted-foreground">正在读取本机词伙卡。</p>;
  }

  if (cards.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          还没有词伙卡。在练习页写完、评阅并完成重写后，卡片会保存在这台浏览器里。
        </p>
        <Button asChild>
          <Link href="/practice">去练习</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        已保存 {cards.length} 张。间隔复习还没接上，这里只列出落卡结果。
      </p>
      {cards.map((card) => (
        <VocabCardView key={card.id} card={card} rewrite={card.user_rewrite} />
      ))}
    </div>
  );
}
