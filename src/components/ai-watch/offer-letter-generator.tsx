"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateCoverLetterAction } from "@/app/actions/cover-letter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LetterResult } from "@/components/workshop/letter-result";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";
import type { CoverLetterDraft, LetterTone } from "@/lib/workshop/types";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";

interface OfferLetterGeneratorProps {
  /** Cible déjà connue (l'offre affichée dans la modal) — pas de sélecteur à afficher. */
  company: string;
  role: string;
  description: string | null;
}

export function OfferLetterGenerator({
  company,
  role,
  description,
}: OfferLetterGeneratorProps) {
  const t = useT();
  const [tone, setTone] = useState<LetterTone>("formal");
  const [draft, setDraft] = useState<CoverLetterDraft | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const result = await generateCoverLetterAction({
        company,
        role,
        description,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-[12px] bg-muted px-[18px] py-[14px]">
        <p className="text-[13px] text-foreground">
          {company} — {role}
        </p>

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
          disabled={generateMutation.isPending}
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

      {generateMutation.isPending && (
        <div className="flex flex-col gap-3 rounded-[12px] bg-muted px-[18px] py-[14px]">
          <div className="h-5 w-2/3 animate-pulse rounded-md bg-background" />
          <div className="h-4 w-full animate-pulse rounded-md bg-background" />
          <div className="h-4 w-full animate-pulse rounded-md bg-background" />
          <div className="h-4 w-5/6 animate-pulse rounded-md bg-background" />
        </div>
      )}

      {draft && !generateMutation.isPending && (
        <LetterResult draft={draft} company={company} role={role} tone={tone} />
      )}
    </div>
  );
}
