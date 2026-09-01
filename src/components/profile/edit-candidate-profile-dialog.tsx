"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { WORKPLACE_PREFERENCES } from "@/lib/validation/profile";

import { TagInput } from "./tag-input";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";
const fieldInputClassName =
  "h-auto rounded-[9px] border-[1.5px] border-input bg-muted px-[14px] py-[11px] text-[13.5px] text-foreground shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-0";

interface CandidateProfileFormValues {
  skills: string[];
  industries: string[];
  workplacePreference: (typeof WORKPLACE_PREFERENCES)[number][];
  yearsOfExperience: string;
}

interface EditCandidateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
}

export function EditCandidateProfileDialog({
  open,
  onOpenChange,
  profile,
}: EditCandidateProfileDialogProps) {
  const t = useT();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (values: CandidateProfileFormValues) => {
      const yearsOfExperience =
        values.yearsOfExperience.trim() === ""
          ? null
          : Number(values.yearsOfExperience);

      const result = await updateProfileAction({
        skills: values.skills,
        industries: values.industries,
        workplacePreference: values.workplacePreference,
        yearsOfExperience,
      });

      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      toast.success(t.profile.toasts.candidateProfileUpdated);
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const form = useForm({
    defaultValues: {
      skills: profile?.skills ?? [],
      industries: profile?.industries ?? [],
      workplacePreference: (profile?.workplacePreference ??
        []) as CandidateProfileFormValues["workplacePreference"],
      yearsOfExperience:
        profile?.yearsOfExperience != null
          ? String(profile.yearsOfExperience)
          : "",
    } as CandidateProfileFormValues,
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
            {t.profile.dialogs.editCandidateProfile.title}
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
          <form.Field name="skills">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.profile.dialogs.editCandidateProfile.skillsLabel}
                </Label>
                <TagInput
                  id={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  placeholder={
                    t.profile.dialogs.editCandidateProfile.skillsPlaceholder
                  }
                />
              </div>
            )}
          </form.Field>

          <form.Field name="industries">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.profile.dialogs.editCandidateProfile.industriesLabel}
                </Label>
                <TagInput
                  id={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  placeholder={
                    t.profile.dialogs.editCandidateProfile.industriesPlaceholder
                  }
                />
              </div>
            )}
          </form.Field>

          <form.Field name="workplacePreference">
            {(field) => (
              <div className="space-y-1.5">
                <Label className={fieldLabelClassName}>
                  {
                    t.profile.dialogs.editCandidateProfile
                      .workplacePreferenceLabel
                  }
                </Label>
                <div className="flex flex-col gap-2">
                  {WORKPLACE_PREFERENCES.map((option) => {
                    const checked = field.state.value.includes(option);
                    return (
                      <div key={option} className="flex items-center gap-2">
                        <Checkbox
                          id={`${field.name}-${option}`}
                          checked={checked}
                          onCheckedChange={(next) => {
                            if (next === true) {
                              field.handleChange([
                                ...field.state.value,
                                option,
                              ]);
                            } else {
                              field.handleChange(
                                field.state.value.filter((v) => v !== option),
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`${field.name}-${option}`}
                          className="text-[13.5px] font-normal text-foreground"
                        >
                          {t.profile.workplaceOptions[option]}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="yearsOfExperience">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {
                    t.profile.dialogs.editCandidateProfile
                      .yearsOfExperienceLabel
                  }
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={0}
                  max={60}
                  placeholder="5"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className={fieldInputClassName}
                />
              </div>
            )}
          </form.Field>

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
                  {t.profile.dialogs.editCandidateProfile.save}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
