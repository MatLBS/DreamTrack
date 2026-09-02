"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCoverLetterAction } from "@/app/actions/cover-letter";
import { SpotlightCard } from "@/components/profile/spotlight-card";
import type { CoverLetterRow } from "@/db/schema";
import { dateLocales } from "@/lib/i18n/date-locales";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useLocale, useT } from "@/lib/i18n/locale-provider";

import { COVER_LETTERS_QUERY_KEY } from "./query-keys";

const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-muted-foreground";
const rowClassName =
  "flex items-center justify-between gap-3 rounded-[12px] bg-muted px-[18px] py-[14px] text-[14px] text-foreground";

interface SavedLettersCardProps {
  letters: CoverLetterRow[];
  onOpen: (letter: CoverLetterRow) => void;
}

export function SavedLettersCard({ letters, onOpen }: SavedLettersCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCoverLetterAction(id);
      if (!result.ok) throw new ActionError(result.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COVER_LETTERS_QUERY_KEY });
      toast.success(t.workshop.toasts.letterDeleted);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  return (
    <SpotlightCard>
      <div className={sectionLabelClassName}>
        {t.workshop.letter.savedTitle}
      </div>

      {letters.length === 0 ? (
        <div className={rowClassName}>
          <span className="text-muted-foreground">
            {t.workshop.letter.savedEmpty}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {letters.map((letter) => (
            <div key={letter.id} className={rowClassName}>
              <button
                type="button"
                onClick={() => onOpen(letter)}
                aria-label={t.workshop.letter.openAria}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate font-bold">
                  {letter.company} — {letter.role}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {formatDistanceToNow(letter.updatedAt, {
                    addSuffix: true,
                    locale: dateLocales[locale],
                  })}
                </div>
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(letter.id)}
                disabled={deleteMutation.isPending}
                aria-label={t.workshop.letter.deleteAria}
                className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SpotlightCard>
  );
}
