"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateCoverLetterAction } from "@/app/actions/cover-letter";
import { SpotlightCard } from "@/components/profile/spotlight-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";
import type {
  CoverLetterDraft,
  LetterTarget,
  LetterTone,
} from "@/lib/workshop/types";

import { LetterResult } from "./letter-result";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";

interface LetterGeneratorProps {
  hasReadyDocument: boolean;
  targets: LetterTarget[];
  onGoToDocuments: () => void;
}

export function LetterGenerator({
  hasReadyDocument,
  targets,
  onGoToDocuments,
}: LetterGeneratorProps) {
  const t = useT();
  const [targetId, setTargetId] = useState<string>(targets[0]?.id ?? "");
  const [tone, setTone] = useState<LetterTone>("formal");
  const [draft, setDraft] = useState<CoverLetterDraft | null>(null);

  const selectedTarget = targets.find((target) => target.id === targetId);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTarget) return null;
      const result = await generateCoverLetterAction({
        company: selectedTarget.company,
        role: selectedTarget.role,
        description: null,
        tone,
      });
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: (data) => {
      setDraft(data);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  function handleGenerate() {
    setDraft(null);
    generateMutation.mutate();
  }

  if (!hasReadyDocument) {
    return (
      <SpotlightCard>
        <div className="flex flex-col items-center gap-3 rounded-[12px] bg-muted px-[18px] py-10 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="text-[14px] font-bold text-foreground">
            {t.workshop.letter.emptyTitle}
          </p>
          <p className="max-w-xs text-[12.5px] text-muted-foreground">
            {t.workshop.letter.emptyDescription}
          </p>
          <Button type="button" onClick={onGoToDocuments} className="mt-2">
            {t.workshop.letter.goToDocuments}
          </Button>
        </div>
      </SpotlightCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SpotlightCard>
        <div className="flex flex-col gap-[18px]">
          <div className="space-y-1.5">
            <label className={fieldLabelClassName}>
              {t.workshop.letter.targetLabel}
            </label>
            <Select
              value={targetId}
              onValueChange={(value) => {
                if (value) setTargetId(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t.workshop.letter.targetPlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.company} — {target.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabelClassName}>
              {t.workshop.letter.toneLabel}
            </label>
            <Select
              value={tone}
              onValueChange={(value) => setTone(value as LetterTone)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">
                  {t.workshop.letter.tones.formal}
                </SelectItem>
                <SelectItem value="conversational">
                  {t.workshop.letter.tones.conversational}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            disabled={!selectedTarget || generateMutation.isPending}
            onClick={handleGenerate}
            className="self-start"
          >
            {generateMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {generateMutation.isPending
              ? t.workshop.letter.generating
              : t.workshop.letter.generate}
          </Button>
        </div>
      </SpotlightCard>

      {generateMutation.isPending && (
        <SpotlightCard>
          <div className="flex flex-col gap-3">
            <div className="h-5 w-2/3 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-4/6 animate-pulse rounded-md bg-muted" />
          </div>
        </SpotlightCard>
      )}

      {draft && !generateMutation.isPending && selectedTarget && (
        <LetterResult
          draft={draft}
          company={selectedTarget.company}
          role={selectedTarget.role}
          tone={tone}
        />
      )}
    </div>
  );
}
