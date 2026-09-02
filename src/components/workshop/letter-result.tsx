"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  saveCoverLetterAction,
  updateCoverLetterAction,
} from "@/app/actions/cover-letter";
import { SpotlightCard } from "@/components/profile/spotlight-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";
import type { CoverLetterDraft, LetterTone } from "@/lib/workshop/types";

import { COVER_LETTERS_QUERY_KEY } from "./query-keys";

interface LetterResultProps {
  draft: CoverLetterDraft;
  company: string;
  role: string;
  tone: LetterTone;
  /** Défini quand on édite une lettre déjà enregistrée — sinon la sauvegarde crée une ligne. */
  coverLetterId?: string;
}

export function LetterResult({
  draft,
  company,
  role,
  tone,
  coverLetterId,
}: LetterResultProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [paragraphs, setParagraphs] = useState(draft.paragraphs);
  const [factsOpen, setFactsOpen] = useState(false);

  function handleParagraphChange(index: number, value: string) {
    setParagraphs((current) =>
      current.map((paragraph, i) => (i === index ? value : paragraph)),
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(paragraphs.join("\n\n"));
    toast.success(t.workshop.toasts.letterCopied);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = coverLetterId
        ? await updateCoverLetterAction(coverLetterId, paragraphs)
        : await saveCoverLetterAction({ company, role, paragraphs, tone });
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COVER_LETTERS_QUERY_KEY });
      toast.success(t.workshop.toasts.letterSaved);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  return (
    <SpotlightCard>
      <div className="flex flex-col gap-[18px]">
        {draft.insufficientContext && (
          <div className="flex items-start gap-2.5 rounded-[12px] bg-amber-100 px-[18px] py-[14px] text-[12.5px] text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{t.workshop.letter.insufficientContextWarning}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {paragraphs.map((paragraph, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                <button
                  type="button"
                  aria-label={t.workshop.letter.regenerateParagraphAria}
                  disabled
                  className="flex size-6 items-center justify-center rounded-[8px] text-muted-foreground opacity-50"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              </div>
              <Textarea
                value={paragraph}
                onChange={(event) =>
                  handleParagraphChange(index, event.target.value)
                }
                rows={4}
                className="min-h-[90px]"
              />
            </div>
          ))}
        </div>

        {draft.usedFacts.length > 0 && (
          <div className="rounded-[12px] bg-muted">
            <button
              type="button"
              onClick={() => setFactsOpen((open) => !open)}
              className="flex w-full items-center justify-between px-[18px] py-[14px] text-left text-[13px] font-bold text-foreground"
            >
              {t.workshop.letter.usedFactsTitle}
              <ChevronDown
                className={`size-4 shrink-0 transition-transform ${factsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {factsOpen && (
              <div className="flex flex-col gap-2 px-[18px] pb-[14px]">
                {draft.usedFacts.map((fact, index) => (
                  <p
                    key={index}
                    className="rounded-[9px] bg-background px-[14px] py-[11px] text-[12.5px] text-foreground"
                  >
                    {fact}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCopy}>
            {t.workshop.letter.copy}
          </Button>
          <Button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {t.workshop.letter.save}
          </Button>
        </div>
      </div>
    </SpotlightCard>
  );
}
