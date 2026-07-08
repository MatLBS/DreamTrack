"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  deleteApplicationAction,
  moveApplicationAction,
} from "@/app/actions/application";
import { getBoardAction, getSankeyAction } from "@/app/actions/board";
import {
  deleteColumnAction,
  setColumnCategoryAction,
} from "@/app/actions/column";
import { Button } from "@/components/ui/button";
import type { Application, Column } from "@/db/schema";
import type { SankeyData } from "@/lib/sankey/aggregate";
import { SankeyChart } from "@/components/sankey/sankey-chart";
import type { BoardColumn } from "@/services/application";

import { ApplicationCard } from "./card";
import { ApplicationDialog } from "./application-dialog";
import { ColumnDialog } from "./column-dialog";
import { KanbanColumn } from "./column";
import { RenameColumnDialog } from "./rename-column-dialog";

interface BoardViewProps {
  initialBoard: BoardColumn[];
  initialSankey: SankeyData;
}

interface MoveVariables {
  applicationId: string;
  toColumnId: string;
  toIndex: number;
}

function applyOptimisticMove(
  board: BoardColumn[],
  { applicationId, toColumnId, toIndex }: MoveVariables,
): BoardColumn[] {
  let moved: Application | undefined;
  const withoutCard = board.map((column) => {
    const found = column.applications.find((a) => a.id === applicationId);
    if (!found) return column;
    moved = found;
    return {
      ...column,
      applications: column.applications.filter((a) => a.id !== applicationId),
    };
  });

  if (!moved) return board;

  return withoutCard.map((column) => {
    if (column.id !== toColumnId) return column;
    const applications = [...column.applications];
    const clampedIndex = Math.max(0, Math.min(toIndex, applications.length));
    applications.splice(clampedIndex, 0, { ...moved!, columnId: toColumnId });
    return { ...column, applications };
  });
}

export function BoardView({ initialBoard, initialSankey }: BoardViewProps) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<
    | { open: false }
    | { open: true; application?: Application; columnId?: string }
  >({ open: false });
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [renameDialogState, setRenameDialogState] = useState<
    { open: false } | { open: true; column: Column }
  >({ open: false });

  const boardQuery = useQuery({
    queryKey: ["board"],
    queryFn: getBoardAction,
    initialData: initialBoard,
  });

  const sankeyQuery = useQuery({
    queryKey: ["sankey"],
    queryFn: getSankeyAction,
    initialData: initialSankey,
  });

  const board = boardQuery.data;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const moveMutation = useMutation({
    mutationFn: ({ applicationId, toColumnId, toIndex }: MoveVariables) =>
      moveApplicationAction(applicationId, { toColumnId, toIndex }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["board"] });
      const previousBoard = queryClient.getQueryData<BoardColumn[]>(["board"]);
      queryClient.setQueryData<BoardColumn[]>(["board"], (old) =>
        old ? applyOptimisticMove(old, variables) : old,
      );
      return { previousBoard };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board"], context.previousBoard);
      }
      toast.error("Impossible de déplacer la carte");
    },
    onSuccess: (result) => {
      if (!result.ok) toast.error(result.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (applicationId: string) =>
      deleteApplicationAction(applicationId),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Candidature supprimée");
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
    },
    onError: () => toast.error("Impossible de supprimer la candidature"),
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: ({
      columnId,
      isLostStage,
    }: {
      columnId: string;
      isLostStage: boolean;
    }) => setColumnCategoryAction(columnId, { isLostStage }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
    },
    onError: () => toast.error("Impossible de changer la catégorie"),
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => deleteColumnAction(columnId),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Colonne supprimée");
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
    },
    onError: () => toast.error("Impossible de supprimer la colonne"),
  });

  function findColumnByCardId(cardId: string): BoardColumn | undefined {
    return board.find((column) =>
      column.applications.some((application) => application.id === cardId),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceColumn = findColumnByCardId(activeId);
    if (!sourceColumn) return;

    const overColumn = board.find((column) => column.id === overId);
    let toColumnId: string;
    let toIndex: number;

    if (overColumn) {
      toColumnId = overColumn.id;
      toIndex = overColumn.applications.length;
    } else {
      const targetColumn = findColumnByCardId(overId);
      if (!targetColumn) return;
      toColumnId = targetColumn.id;
      toIndex = targetColumn.applications.findIndex((a) => a.id === overId);
    }

    if (toColumnId === sourceColumn.id) {
      const fromIndex = sourceColumn.applications.findIndex(
        (a) => a.id === activeId,
      );
      if (fromIndex === toIndex) return;
    }

    moveMutation.mutate({ applicationId: activeId, toColumnId, toIndex });
  }

  const activeApplication = activeId
    ? board.flatMap((c) => c.applications).find((a) => a.id === activeId)
    : undefined;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 mt-10">
      <h1 className="text-[22px] font-extrabold">Suivi de candidatures</h1>

      <DndContext
        id="kanban-board"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2">
          {board.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onEditApplication={(applicationId) => {
                const application = column.applications.find(
                  (a) => a.id === applicationId,
                );
                if (application) setDialogState({ open: true, application });
              }}
              onDeleteApplication={(applicationId) =>
                deleteMutation.mutate(applicationId)
              }
              onToggleCategory={() =>
                toggleCategoryMutation.mutate({
                  columnId: column.id,
                  isLostStage: !column.isLostStage,
                })
              }
              onAddApplication={(columnId) =>
                setDialogState({ open: true, columnId })
              }
              onRenameColumn={(col) =>
                setRenameDialogState({ open: true, column: col })
              }
              onDeleteColumn={(columnId) =>
                deleteColumnMutation.mutate(columnId)
              }
            />
          ))}
          <div className="flex w-[266px] shrink-0 items-start pt-1">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setColumnDialogOpen(true)}
            >
              <Plus className="size-4" />
              Ajouter une colonne
            </Button>
          </div>
        </div>

        <DragOverlay>
          {activeApplication && (
            <ApplicationCard application={activeApplication} isOverlay />
          )}
        </DragOverlay>
      </DndContext>

      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-[15px] font-extrabold">Flux des candidatures</h2>
        <SankeyChart data={sankeyQuery.data} />
      </div>

      <ApplicationDialog
        open={dialogState.open}
        onOpenChange={(open) =>
          setDialogState(open ? { open: true } : { open: false })
        }
        application={dialogState.open ? dialogState.application : undefined}
        defaultColumnId={dialogState.open ? dialogState.columnId : undefined}
      />

      <ColumnDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        columns={board}
      />

      <RenameColumnDialog
        open={renameDialogState.open}
        onOpenChange={(open) =>
          setRenameDialogState(
            open && renameDialogState.open
              ? { open: true, column: renameDialogState.column }
              : { open: false },
          )
        }
        column={renameDialogState.open ? renameDialogState.column : undefined}
      />
    </div>
  );
}
