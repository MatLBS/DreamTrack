"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/actions/profile";
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
import type { Profile } from "@/db/schema";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

import { TagInput } from "./tag-input";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";
const fieldInputClassName =
  "h-auto rounded-[9px] border-[1.5px] border-input bg-muted px-[14px] py-[11px] text-[13.5px] text-foreground shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-0";

interface ProfileFormValues {
  positions: string[];
  locations: string[];
  salaryMin: string;
  salaryMax: string;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
}: EditProfileDialogProps) {
  const t = useT();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const salaryMin =
        values.salaryMin.trim() === "" ? null : Number(values.salaryMin);
      const salaryMax =
        values.salaryMax.trim() === "" ? null : Number(values.salaryMax);

      const result = await updateProfileAction({
        desiredPositions: values.positions,
        locations: values.locations,
        salaryMin,
        salaryMax,
      });

      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      toast.success(t.profile.toasts.preferencesUpdated);
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const form = useForm({
    defaultValues: {
      positions: profile?.desiredPositions ?? [],
      locations: profile?.locations ?? [],
      salaryMin: profile?.salaryMin != null ? String(profile.salaryMin) : "",
      salaryMax: profile?.salaryMax != null ? String(profile.salaryMax) : "",
    } as ProfileFormValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-[16px] bg-popover pt-[26px] pr-[28px] pb-[22px] pl-[28px] text-foreground shadow-[0_20px_50px_rgba(20,20,20,0.18)] ring-0 sm:max-w-[420px]"
      >
        <DialogHeader className="mb-[22px] flex-row items-center justify-between">
          <DialogTitle className="font-sans text-[18px] font-extrabold text-foreground">
            {t.profile.dialogs.editProfile.title}
          </DialogTitle>
          <DialogClose
            render={
              <button
                type="button"
                className="flex size-[26px] shrink-0 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">{t.common.close}</span>
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
          <form.Field name="positions">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.profile.dialogs.editProfile.positionsLabel}
                </Label>
                <TagInput
                  id={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  placeholder={
                    t.profile.dialogs.editProfile.positionsPlaceholder
                  }
                />
              </div>
            )}
          </form.Field>

          <form.Field name="locations">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.profile.dialogs.editProfile.locationsLabel}
                </Label>
                <TagInput
                  id={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  placeholder={
                    t.profile.dialogs.editProfile.locationsPlaceholder
                  }
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="salaryMin"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  if (value.trim() === "") return undefined;
                  if (Number.isNaN(Number(value)))
                    return t.profile.dialogs.editProfile.invalid;
                  const max = fieldApi.form.getFieldValue("salaryMax");
                  if (max && max.trim() !== "" && Number(value) > Number(max)) {
                    return t.profile.dialogs.editProfile.minGreaterThanMax;
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className={fieldLabelClassName}>
                    {t.profile.dialogs.editProfile.salaryMinLabel}
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min={0}
                    placeholder="45"
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

            <form.Field name="salaryMax">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className={fieldLabelClassName}>
                    {t.profile.dialogs.editProfile.salaryMaxLabel}
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min={0}
                    placeholder="55"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className={fieldInputClassName}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter className="m-0 flex-row justify-end gap-[10px] rounded-none border-0 bg-transparent p-0 pt-1.5">
            <Button
              type="button"
              variant="ghost"
              className="h-auto rounded-[9px] px-[18px] py-[11px] text-[13px] font-bold text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
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
                  {t.profile.dialogs.editProfile.save}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
