"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Camera, XIcon } from "lucide-react";
import { toast } from "sonner";

import { updateAccountAction } from "@/app/actions/account";
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
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-[#6b6b76] uppercase";
const fieldInputClassName =
  "h-auto rounded-[9px] border-[1.5px] border-[#d5d5db] bg-[#fafafb] px-[14px] py-[11px] text-[13.5px] text-[#3a3a42] shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] placeholder:text-[#9a9aa3] focus-visible:border-[#7F1734] focus-visible:ring-0";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name: string; image?: string | null };
}

export function EditAccountDialog({
  open,
  onOpenChange,
  user,
}: EditAccountDialogProps) {
  const t = useT();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const previewUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(next);
  }

  const mutation = useMutation({
    mutationFn: async (values: { name: string }) => {
      const formData = new FormData();
      formData.set("name", values.name.trim());
      if (avatarFile) formData.set("avatar", avatarFile);

      const result = await updateAccountAction(formData);
      if (!result.ok) throw new ActionError(result.code);
    },
    onSuccess: () => {
      toast.success(t.profile.toasts.accountUpdated);
      handleOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const form = useForm({
    defaultValues: { name: user.name },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const avatarSrc = previewUrl ?? user.image ?? null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-[16px] bg-white pt-[26px] pr-[28px] pb-[22px] pl-[28px] text-[#14161c] shadow-[0_20px_50px_rgba(20,20,20,0.18)] ring-0 sm:max-w-[380px]"
      >
        <DialogHeader className="mb-[22px] flex-row items-center justify-between">
          <DialogTitle className="font-sans text-[18px] font-extrabold text-[#14161c]">
            {t.profile.dialogs.editAccount.title}
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
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t.profile.dialogs.editAccount.changePhotoAria}
              className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eee5cc] text-[18px] font-extrabold text-[#8a6d1a]"
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                getInitials(user.name)
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5 text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setAvatarFile(file);
              }}
            />
          </div>

          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0
                  ? t.profile.dialogs.editAccount.nameRequired
                  : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.profile.dialogs.editAccount.nameLabel}
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder={t.profile.dialogs.editAccount.namePlaceholder}
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

          <DialogFooter className="m-0 flex-row justify-end gap-[10px] rounded-none border-0 bg-transparent p-0 pt-1.5">
            <Button
              type="button"
              variant="ghost"
              className="h-auto rounded-[9px] px-[18px] py-[11px] text-[13px] font-bold text-[#6b6b76] hover:bg-transparent hover:text-[#14161c]"
              onClick={() => handleOpenChange(false)}
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
                  {t.profile.dialogs.editAccount.save}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
