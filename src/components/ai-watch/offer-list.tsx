"use client";

import type { JobOffer } from "@/db/schema";
import { useT } from "@/lib/i18n/locale-provider";

import { OfferCard } from "./offer-card";

interface OfferListProps {
  offers: JobOffer[];
  entryColumnId: string | undefined;
}

export function OfferList({ offers, entryColumnId }: OfferListProps) {
  const t = useT();

  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t.aiWatch.offers.empty}</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} entryColumnId={entryColumnId} />
      ))}
    </div>
  );
}
