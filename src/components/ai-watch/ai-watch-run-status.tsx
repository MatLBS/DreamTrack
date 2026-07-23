"use client";

import { Loader2Icon } from "lucide-react";

import type { AiWatchRunState } from "@/hooks/use-ai-watch-stream";
import { useT } from "@/lib/i18n/locale-provider";

interface AiWatchRunStatusProps {
  runState: AiWatchRunState;
}

export function AiWatchRunStatus({ runState }: AiWatchRunStatusProps) {
  const t = useT();

  if (runState.status === "idle") return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
      {runState.status === "running" && (
        <div className="flex items-center gap-2 font-medium">
          <Loader2Icon className="size-4 animate-spin" />
          {t.aiWatch.runStatus.started}
        </div>
      )}
      {runState.status === "error" && (
        <p className="font-medium text-destructive">
          {t.aiWatch.runStatus.error}
          {runState.errorMessage ? ` — ${runState.errorMessage}` : ""}
        </p>
      )}
      {runState.steps.length > 0 && (
        <ul className="flex flex-col gap-1 text-muted-foreground">
          {runState.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
