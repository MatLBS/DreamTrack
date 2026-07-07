"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createColumnAction } from "@/app/actions/column";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Column } from "@/db/schema";

interface ColumnFormValues {
  name: string;
  afterColumnId: string;
  advancesCandidacy: boolean;
}

interface ColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
}

/** Les 2 dernières colonnes (terminales, cf. TERMINAL_COUNT dans services/column.ts) ne peuvent pas précéder une nouvelle colonne. */
function getInsertablePredecessors(columns: Column[]): Column[] {
  return [...columns].sort((a, b) => a.position - b.position).slice(0, -2);
}

export function ColumnDialog({
  open,
  onOpenChange,
  columns,
}: ColumnDialogProps) {
  const queryClient = useQueryClient();
  const predecessors = getInsertablePredecessors(columns);
  const defaultAfterColumnId = predecessors.at(-1)?.id ?? "";

  const mutation = useMutation({
    mutationFn: async (values: ColumnFormValues) => {
      const afterColumn = predecessors.find(
        (c) => c.id === values.afterColumnId,
      );
      if (!afterColumn) throw new Error("Colonne de référence introuvable");

      const result = await createColumnAction({
        name: values.name.trim(),
        index: afterColumn.position + 1,
        isLostStage: !values.advancesCandidacy,
      });

      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
      toast.success("Colonne ajoutée");
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error("Une erreur est survenue, réessaie.");
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      afterColumnId: defaultAfterColumnId,
      advancesCandidacy: true,
    } as ColumnFormValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une colonne</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0 ? "Le nom est requis" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Nom</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="afterColumnId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Insérer après</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as string)}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Choisir une colonne">
                      {(value: string | null) =>
                        predecessors.find((c) => c.id === value)?.name ??
                        "Choisir une colonne"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {predecessors.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field name="advancesCandidacy">
            {(field) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
                <Label
                  htmlFor={field.name}
                  className="flex items-center gap-2 font-normal"
                >
                  Cette étape fait avancer la candidature
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: field.state.value
                        ? "var(--sankey-positive)"
                        : "var(--sankey-negative)",
                    }}
                  />
                </Label>
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <form.Subscribe
              selector={(state) =>
                [state.canSubmit, state.isSubmitting] as const
              }
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={
                    !canSubmit || isSubmitting || predecessors.length === 0
                  }
                >
                  Ajouter
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
