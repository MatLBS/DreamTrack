"use client";

import { useT } from "@/lib/i18n/locale-provider";

interface TagListProps {
  items: string[] | undefined;
}

export function TagList({ items }: TagListProps) {
  const t = useT();
  if (!items || items.length === 0) {
    return <span className="font-bold">{t.profile.notProvided}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-[8px] border border-border bg-card px-3 py-1.5 text-[12px] font-bold text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
