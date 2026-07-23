"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { Clock, ExternalLink, MoreVertical, Star } from "lucide-react";

import type { Application } from "@/db/schema";
import { CompanyLogo } from "@/components/brand/company-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { dateLocales } from "@/lib/i18n/date-locales";
import { useLocale, useT } from "@/lib/i18n/locale-provider";

function formatDaysInStep(days: number, locale: "fr" | "en"): string {
  if (days < 1) {
    return locale === "fr" ? "< 1 j" : "< 1 d";
  }
  const suffix = locale === "fr" ? "j" : "d";
  return `${days} ${suffix}`;
}

interface ApplicationCardProps {
  application: Application & { daysInCurrentStep: number };
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  isOverlay?: boolean;
}

export function ApplicationCard({
  application,
  onEdit,
  onDelete,
  onToggleFavorite,
  isOverlay,
}: ApplicationCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab touch-none rounded-xl border bg-card p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40",
        isOverlay && "shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CompanyLogo
            company={application.company}
            iconUrl={application.iconUrl}
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{application.role}</p>
            <p className="truncate text-xs text-muted-foreground">
              {application.company}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleFavorite}
          >
            <Star
              className={cn(
                "size-4",
                application.isFavorite
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/60",
              )}
            />
            <span className="sr-only">
              {application.isFavorite
                ? t.kanban.unmarkFavoriteAria
                : t.kanban.markFavoriteAria}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <MoreVertical className="size-4 text-muted-foreground/60" />
              <span className="sr-only">{t.kanban.cardActionsAria}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                {t.kanban.editCard}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                {t.kanban.deleteCard}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {application.url && (
        <a
          href={application.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:underline dark:bg-amber-950 dark:text-amber-300"
        >
          <ExternalLink className="size-3" />
          {t.kanban.offerLink}
        </a>
      )}

      <div
        className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
        aria-label={
          application.daysInCurrentStep < 1
            ? t.kanban.daysInStepLessThanOne
            : t.kanban.daysInStepAria(application.daysInCurrentStep)
        }
      >
        <Clock className="size-3" />
        {formatDaysInStep(application.daysInCurrentStep, locale)}
      </div>

      <p className="mt-2 text-[10.5px] text-muted-foreground">
        {formatDistanceToNow(application.createdAt, {
          addSuffix: true,
          locale: dateLocales[locale],
        })}
      </p>
    </div>
  );
}
