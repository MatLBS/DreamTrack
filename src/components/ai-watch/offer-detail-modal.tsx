"use client";

import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createApplicationAction } from "@/app/actions/application";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { JobOffer } from "@/db/schema";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

interface OfferDetailModalProps {
  offer: JobOffer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryColumnId: string | undefined;
}

function getScoreBadgeClass(score: number): string {
  if (score >= 70) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  }
  if (score >= 40) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  }
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

export function OfferDetailModal({
  offer,
  open,
  onOpenChange,
  entryColumnId,
}: OfferDetailModalProps) {
  const t = useT();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!entryColumnId) {
        throw new Error("No entry column available");
      }

      const formData = new FormData();
      formData.set("company", offer.company);
      formData.set("role", offer.role);
      formData.set("url", offer.url);
      if (offer.matchReason) {
        formData.set("notes", offer.matchReason);
      }
      formData.set("columnId", entryColumnId);

      const result = await createApplicationAction(formData);
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
      toast.success(t.aiWatch.toasts.addedToDashboard);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        actionErrorMessage(t, error) || t.aiWatch.toasts.addToDashboardFailed,
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {offer.role}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {offer.company}
            {offer.location ? ` — ${offer.location}` : ""}
          </p>

          <span
            className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getScoreBadgeClass(offer.matchScore)}`}
          >
            {t.aiWatch.offers.scoreLabel(offer.matchScore)}
          </span>

          {offer.matchReason && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {offer.matchReason}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t.aiWatch.offers.viewOffer}
              <ExternalLinkIcon className="size-4" />
            </a>

            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !entryColumnId}
            >
              <PlusIcon className="size-4" />
              {t.aiWatch.offers.addToDashboard}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
