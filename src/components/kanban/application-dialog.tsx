"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createApplicationAction,
  updateApplicationAction,
} from "@/app/actions/application";
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
import { Textarea } from "@/components/ui/textarea";
import type { Application } from "@/db/schema";

interface ApplicationFormValues {
  company: string;
  role: string;
  url: string;
  notes: string;
}

interface ApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: Application;
}

export function ApplicationDialog({
  open,
  onOpenChange,
  application,
}: ApplicationDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(application);

  const mutation = useMutation({
    mutationFn: async (values: ApplicationFormValues) => {
      const payload = {
        company: values.company.trim(),
        role: values.role.trim(),
        url: values.url.trim() === "" ? null : values.url.trim(),
        notes: values.notes.trim() === "" ? null : values.notes.trim(),
      };
      const result = application
        ? await updateApplicationAction(application.id, payload)
        : await createApplicationAction(payload);

      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      if (!isEdit) queryClient.invalidateQueries({ queryKey: ["sankey"] });
      toast.success(isEdit ? "Candidature mise à jour" : "Candidature ajoutée");
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error("Une erreur est survenue, réessaie.");
    },
  });

  const form = useForm({
    defaultValues: {
      company: application?.company ?? "",
      role: application?.role ?? "",
      url: application?.url ?? "",
      notes: application?.notes ?? "",
    } as ApplicationFormValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la candidature" : "Ajouter une candidature"}
          </DialogTitle>
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
            name="company"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0 ? "L'entreprise est requise" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Entreprise</Label>
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

          <form.Field
            name="role"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0 ? "Le poste est requis" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Poste</Label>
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

          <form.Field
            name="url"
            validators={{
              onChange: ({ value }) => {
                if (value.trim() === "") return undefined;
                try {
                  new URL(value);
                  return undefined;
                } catch {
                  return "URL invalide";
                }
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Lien de l&apos;offre</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="https://..."
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

          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Notes</Label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  rows={3}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
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
              selector={(state) => [state.canSubmit, state.isSubmitting] as const}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isEdit ? "Enregistrer" : "Ajouter"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
