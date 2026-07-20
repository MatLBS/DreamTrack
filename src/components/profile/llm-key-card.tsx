"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  getLlmCredentialSummaryAction,
  removeLlmCredentialAction,
} from "@/app/actions/llm-credential";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";
import type { LlmCredentialSummary } from "@/services/llm-credential";

import { LlmKeyDialog } from "./llm-key-dialog";
import { ModifyButton } from "./modify-button";
import { SpotlightCard } from "./spotlight-card";

const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-muted-foreground";
const rowClassName =
  "flex items-center justify-between rounded-[12px] bg-muted px-[18px] py-[14px] text-[14px] text-foreground";

interface LlmKeyCardProps {
  initialSummary: LlmCredentialSummary | null;
}

export function LlmKeyCard({ initialSummary }: LlmKeyCardProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["llm-credential-summary"],
    queryFn: getLlmCredentialSummaryAction,
    initialData: initialSummary,
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const result = await removeLlmCredentialAction();
      if (!result.ok) throw new ActionError(result.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-credential-summary"] });
      toast.success(t.profile.toasts.llmKeyRemoved);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const summary = summaryQuery.data;

  return (
    <SpotlightCard>
      <div className="mb-[18px] flex items-center justify-between">
        <div className={sectionLabelClassName}>{t.profile.llmKey.title}</div>
        <ModifyButton onClick={() => setDialogOpen(true)} />
      </div>
      <div className="flex flex-col gap-3">
        <div className={rowClassName}>
          <span className="font-bold">
            {summary
              ? t.profile.llmKey.keyPreviewLabel(
                  t.profile.llmKey.providers[summary.provider],
                  summary.keyPreview,
                )
              : t.profile.llmKey.emptyState}
          </span>
          {summary && (
            <button
              type="button"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              aria-label={t.profile.llmKey.remove}
              className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      <LlmKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentProvider={summary?.provider}
      />
    </SpotlightCard>
  );
}
