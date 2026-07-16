"use client";

import { useT } from "@/lib/i18n/locale-provider";

export function AiWatchContent() {
  const t = useT();
  return (
    <div className="text-center">
      <h1 className="text-lg font-semibold">{t.aiWatch.title}</h1>
      <p className="text-sm text-muted-foreground">{t.aiWatch.comingSoon}</p>
    </div>
  );
}
