"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { BoardColumn } from "@/services/application";
import { cn } from "@/lib/utils";

import { ApplicationCard } from "./card";

interface KanbanColumnProps {
  column: BoardColumn;
  onEditApplication: (applicationId: string) => void;
  onDeleteApplication: (applicationId: string) => void;
  onToggleCategory: () => void;
}

export function KanbanColumn({
  column,
  onEditApplication,
  onDeleteApplication,
  onToggleCategory,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const isEntryColumn = column.position === 0;

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={
              isEntryColumn
                ? "Étape d'entrée — catégorie fixe"
                : column.isLostStage
                  ? "Marquée comme perdue — cliquer pour repasser en avancement"
                  : "Marquée comme avancement — cliquer pour marquer comme perdue"
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
          <h2 className="truncate text-sm font-medium">{column.name}</h2>
        </div>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {column.applications.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0",
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
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
