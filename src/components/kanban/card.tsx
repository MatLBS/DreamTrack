"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fr } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, MoreVertical } from "lucide-react";

import type { Application } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ApplicationCardProps {
  application: Application;
  onEdit?: () => void;
  onDelete?: () => void;
  isOverlay?: boolean;
}

export function ApplicationCard({
  application,
  onEdit,
  onDelete,
  isOverlay,
}: ApplicationCardProps) {
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
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold">{application.role}</p>
          <p className="truncate text-xs text-muted-foreground">
            {application.company}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <MoreVertical className="size-4 text-muted-foreground/60" />
            <span className="sr-only">Actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Modifier</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {application.url && (
        <a
          href={application.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:underline dark:bg-amber-950 dark:text-amber-300"
        >
          <ExternalLink className="size-3" />
          Offre
        </a>
      )}

      <p className="mt-2 text-[10.5px] text-muted-foreground">
        {formatDistanceToNow(application.createdAt, {
          addSuffix: true,
          locale: fr,
        })}
      </p>
    </div>
  );
}
