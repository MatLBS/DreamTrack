"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MoreVertical, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Column } from "@/db/schema";
import type { BoardColumn } from "@/services/application";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-provider";

import { ApplicationCard } from "./card";

interface KanbanColumnProps {
  column: BoardColumn;
  onEditApplication: (applicationId: string) => void;
  onDeleteApplication: (applicationId: string) => void;
  onToggleApplicationFavorite: (applicationId: string, next: boolean) => void;
  onToggleCategory: () => void;
  onAddApplication: (columnId: string) => void;
  onRenameColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  onEditApplication,
  onDeleteApplication,
  onToggleApplicationFavorite,
  onToggleCategory,
  onAddApplication,
  onRenameColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const isEntryColumn = column.position === 0;

  return (
    <div className="flex w-[266px] shrink-0 flex-col gap-3 rounded-2xl border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={
              isEntryColumn
                ? t.kanban.entryColumnAria
                : column.isLostStage
                  ? t.kanban.lostStageAria
                  : t.kanban.advancingStageAria
            }
            disabled={isEntryColumn}
            onClick={onToggleCategory}
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              isEntryColumn ? "cursor-default" : "cursor-pointer",
            )}
            style={{
              backgroundColor: column.isLostStage
                ? "var(--sankey-negative)"
                : "var(--sankey-positive)",
            }}
          />
          <h2 className="truncate text-[13.5px] font-bold">{column.name}</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <MoreVertical className="size-4 text-muted-foreground" />
            <span className="sr-only">{t.kanban.columnOptionsAria}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRenameColumn(column)}>
              {t.kanban.rename}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteColumn(column.id)}
            >
              {t.kanban.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p
        className="-mt-2 text-[11px] font-semibold"
        style={{ color: "var(--brand)" }}
      >
        {t.kanban.applicationsCount(column.applications.length)}
      </p>

      <Button
        type="button"
        className="w-full rounded-[9px] transition-opacity hover:opacity-90"
        style={{
          backgroundColor: "var(--brand)",
          color: "var(--brand-foreground)",
        }}
        onClick={() => onAddApplication(column.id)}
      >
        <Plus className="size-4" />
      </Button>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto",
          isOver && "bg-accent/40",
        )}
      >
        <SortableContext
          items={column.applications.map((application) => application.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onEdit={() => onEditApplication(application.id)}
              onDelete={() => onDeleteApplication(application.id)}
              onToggleFavorite={() =>
                onToggleApplicationFavorite(
                  application.id,
                  !application.isFavorite,
                )
              }
            />
          ))}
        </SortableContext>
        {column.applications.length === 0 && (
          <p className="py-5 text-center text-xs text-muted-foreground/70">
            {t.kanban.emptyColumn}
          </p>
        )}
      </div>
    </div>
  );
}
