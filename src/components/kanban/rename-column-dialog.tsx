"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { renameColumnAction } from "@/app/actions/column";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Column } from "@/db/schema";

interface RenameColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: Column;
}

export function RenameColumnDialog({
  open,
  onOpenChange,
  column,
}: RenameColumnDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (name: string) => {
      if (!column) throw new Error("Colonne introuvable");
      const result = await renameColumnAction(column.id, { name });
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
      toast.success("Colonne renommée");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Une erreur est survenue, réessaie.");
    },
  });

  const form = useForm({
    defaultValues: { name: column?.name ?? "" },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.name.trim());
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer la colonne</DialogTitle>
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
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  Enregistrer
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
