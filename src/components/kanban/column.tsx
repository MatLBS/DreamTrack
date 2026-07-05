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
}

export function KanbanColumn({
  column,
  onEditApplication,
  onDeleteApplication,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="truncate text-sm font-medium">{column.name}</h2>
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
