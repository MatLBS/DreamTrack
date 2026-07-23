"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  listAiWatchOffersAction,
  saveAiWatchConfigAction,
  triggerAiWatchRunAction,
} from "@/app/actions/ai-watch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AiWatchConfig, JobOffer } from "@/db/schema";
import { useAiWatchStream } from "@/hooks/use-ai-watch-stream";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";
import { AI_WATCH_INTERVALS_MINUTES } from "@/lib/validation/ai-watch";

import { AiWatchRunStatus } from "./ai-watch-run-status";
import { OfferList } from "./offer-list";

const OFFERS_QUERY_KEY = ["ai-watch-offers"];

interface AiWatchContentProps {
  initialConfig: AiWatchConfig | null;
  initialOffers: JobOffer[];
  entryColumnId: string | undefined;
}

function formatLastRun(
  t: ReturnType<typeof useT>,
  config: AiWatchConfig | null,
): string {
  if (!config?.lastRunAt) return t.aiWatch.settings.lastRun.never;
  const date = config.lastRunAt.toLocaleString();
  return config.lastRunStatus === "error"
    ? t.aiWatch.settings.lastRun.error(date)
    : t.aiWatch.settings.lastRun.success(date);
}

export function AiWatchContent({
  initialConfig,
  initialOffers,
  entryColumnId,
}: AiWatchContentProps) {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();

  const offersQuery = useQuery({
    queryKey: OFFERS_QUERY_KEY,
    queryFn: listAiWatchOffersAction,
    initialData: initialOffers,
  });

  const runState = useAiWatchStream(() => {
    queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
  });

  const isRunning = runState.status === "running";

  const saveMutation = useMutation({
    mutationFn: async (values: {
      enabled: boolean;
      intervalMinutes: (typeof AI_WATCH_INTERVALS_MINUTES)[number];
    }) => {
      const result = await saveAiWatchConfigAction(values);
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      toast.success(t.aiWatch.toasts.configSaved);
      router.refresh();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const result = await triggerAiWatchRunAction();
      if (!result.ok) throw new ActionError(result.code);
    },
    onSuccess: () => {
      toast.success(t.aiWatch.toasts.runTriggered);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error) || t.aiWatch.toasts.runFailed);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
    },
  });

  const enabled = initialConfig?.enabled ?? false;
  const intervalMinutes = (initialConfig?.intervalMinutes ??
    1440) as (typeof AI_WATCH_INTERVALS_MINUTES)[number];

  const handleEnabledChange = (checked: boolean) => {
    saveMutation.mutate({ enabled: checked, intervalMinutes });
  };

  const handleIntervalChange = (value: string | null) => {
    if (!value) return;
    saveMutation.mutate({
      enabled,
      intervalMinutes: Number(value) as (typeof AI_WATCH_INTERVALS_MINUTES)[number],
    });
  };

  return (
    <div className="mx-auto mt-20 flex w-full max-w-5xl flex-col gap-4 p-4">
      <h1 className="text-[22px] font-extrabold">{t.aiWatch.title}</h1>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">
          {formatLastRun(t, initialConfig)}
        </p>
        <div className="flex items-center gap-3">
          <Select
            value={String(intervalMinutes)}
            onValueChange={handleIntervalChange}
            disabled={saveMutation.isPending}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_WATCH_INTERVALS_MINUTES.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {t.aiWatch.settings.intervalOptions[minutes]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Switch
            checked={enabled}
            onCheckedChange={handleEnabledChange}
            disabled={saveMutation.isPending}
          />

          <Button
            type="button"
            disabled={isRunning || runMutation.isPending}
            onClick={() => runMutation.mutate()}
          >
            {isRunning
              ? t.aiWatch.settings.running
              : t.aiWatch.settings.runNow}
          </Button>
        </div>
      </div>

      <AiWatchRunStatus runState={runState} />
      <OfferList offers={offersQuery.data} entryColumnId={entryColumnId} />
    </div>
  );
}
