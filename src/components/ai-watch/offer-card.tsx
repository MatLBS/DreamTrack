"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLinkIcon, Maximize2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dismissOfferAction } from "@/app/actions/ai-watch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { JobOffer } from "@/db/schema";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

import { OfferDetailModal } from "./offer-detail-modal";

interface OfferCardProps {
  offer: JobOffer;
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

export function OfferCard({ offer, entryColumnId }: OfferCardProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const result = await dismissOfferAction({ offerId: offer.id });
      if (!result.ok) throw new ActionError(result.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-watch-offers"] });
      toast.success(t.aiWatch.toasts.offerDismissed);
    },
    onError: (error) => {
      toast.error(
        actionErrorMessage(t, error) || t.aiWatch.toasts.dismissFailed,
      );
    },
  });

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsModalOpen(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <Card
        className="shine-border flex flex-col"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CardContent className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {offer.role}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {offer.company}
                {offer.location ? ` — ${offer.location}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
                aria-label={t.aiWatch.offers.expand}
              >
                <Maximize2Icon className="size-4" />
              </button>
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-primary transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={t.aiWatch.offers.viewOffer}
              >
                <ExternalLinkIcon className="size-4" />
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={dismissMutation.isPending}
                onClick={() => dismissMutation.mutate()}
                aria-label={t.aiWatch.offers.dismiss}
                className="p-1.5"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>

          <span
            className={`mt-3 w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getScoreBadgeClass(offer.matchScore)}`}
          >
            {t.aiWatch.offers.scoreLabel(offer.matchScore)}
          </span>

          {offer.matchReason && (
            <p className="mt-3 line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
              {offer.matchReason}
            </p>
          )}
        </CardContent>
      </Card>

      <OfferDetailModal
        offer={offer}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        entryColumnId={entryColumnId}
      />
    </>
  );
}
