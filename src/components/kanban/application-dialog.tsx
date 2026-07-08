"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import {
  createApplicationAction,
  updateApplicationAction,
} from "@/app/actions/application";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Application } from "@/db/schema";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-[#6b6b76] uppercase";
const fieldInputClassName =
  "h-auto rounded-[9px] border-[1.5px] border-[#d5d5db] bg-[#fafafb] px-[14px] py-[11px] text-[13.5px] text-[#3a3a42] shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] placeholder:text-[#9a9aa3] focus-visible:border-[#7F1734] focus-visible:ring-0";

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
  defaultColumnId?: string;
}

export function ApplicationDialog({
  open,
  onOpenChange,
  application,
  defaultColumnId,
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
        : await createApplicationAction({
            ...payload,
            columnId: defaultColumnId,
          });

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
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-[16px] bg-white pt-[26px] pr-[28px] pb-[22px] pl-[28px] text-[#14161c] shadow-[0_20px_50px_rgba(20,20,20,0.18)] ring-0 sm:max-w-[420px]"
      >
        <DialogHeader className="mb-[22px] flex-row items-center justify-between">
          <DialogTitle className="font-sans text-[18px] font-extrabold text-[#14161c]">
            {isEdit ? "Modifier la candidature" : "Ajouter une candidature"}
          </DialogTitle>
          <DialogClose
            render={
              <button
                type="button"
                className="flex size-[26px] shrink-0 items-center justify-center rounded-[8px] text-[#9a9aa3] transition-colors hover:bg-[#f2f2f4] hover:text-[#6b6b76]"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">Fermer</span>
          </DialogClose>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-[18px]"
        >
          <form.Field
            name="company"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0
                  ? "L'entreprise est requise"
                  : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  Entreprise
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Nom de l'entreprise"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className={fieldInputClassName}
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
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  Poste
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Intitulé du poste"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className={fieldInputClassName}
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
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  Lien de l&apos;offre
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="https://..."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className={fieldInputClassName}
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
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  Notes
                </Label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  rows={3}
                  placeholder="Optionnel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className={`${fieldInputClassName} min-h-[74px]`}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter className="m-0 flex-row justify-end gap-[10px] rounded-none border-0 bg-transparent p-0 pt-1.5">
            <Button
              type="button"
              variant="ghost"
              className="h-auto rounded-[9px] px-[18px] py-[11px] text-[13px] font-bold text-[#6b6b76] hover:bg-transparent hover:text-[#14161c]"
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
                  disabled={!canSubmit || isSubmitting}
                  className="h-auto rounded-[9px] px-5 py-[11px] text-[13px] font-bold hover:opacity-90"
                  style={{
                    backgroundColor: "var(--brand)",
                    color: "var(--brand-foreground)",
                  }}
                >
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
