"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, XIcon } from "lucide-react";
import { toast } from "sonner";

import { createApiKeyAction } from "@/app/actions/api-key";
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
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";
const fieldInputClassName =
  "h-auto rounded-[9px] border-[1.5px] border-input bg-muted px-[14px] py-[11px] text-[13.5px] text-foreground shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-0";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApiKeyFormValues {
  name: string;
}

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: ApiKeyFormValues) => {
      const result = await createApiKeyAction({ name: values.name.trim() });
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success(t.profile.toasts.apiKeyCreated);
      setRevealedToken(data.token);
      form.reset();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const form = useForm({
    defaultValues: { name: "" } as ApiKeyFormValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setRevealedToken(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  }

  async function handleCopy() {
    if (!revealedToken) return;
    await navigator.clipboard.writeText(revealedToken);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-[16px] bg-popover pt-[26px] pr-[28px] pb-[22px] pl-[28px] text-foreground shadow-[0_20px_50px_rgba(20,20,20,0.18)] ring-0 sm:max-w-[420px]"
      >
        {revealedToken ? (
          <>
            <DialogHeader className="mb-[18px] flex-row items-center justify-between">
              <DialogTitle className="font-sans text-[18px] font-extrabold text-foreground">
                {t.profile.apiKeys.dialog.revealTitle}
              </DialogTitle>
            </DialogHeader>

            <p className="mb-4 text-[13px] text-destructive">
              {t.profile.apiKeys.dialog.revealWarning}
            </p>

            <div className="mb-5 flex items-center gap-2 rounded-[9px] border-[1.5px] border-input bg-muted px-[14px] py-[11px]">
              <code className="min-w-0 flex-1 truncate text-[12.5px]">
                {revealedToken}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1 rounded-[7px] px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    {t.profile.apiKeys.dialog.copied}
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    {t.profile.apiKeys.dialog.copy}
                  </>
                )}
              </button>
            </div>

            <DialogFooter className="m-0 flex-row justify-end gap-[10px] rounded-none border-0 bg-transparent p-0">
              <Button
                type="button"
                className="h-auto rounded-[9px] px-5 py-[11px] text-[13px] font-bold hover:opacity-90"
                style={{
                  backgroundColor: "var(--brand)",
                  color: "var(--brand-foreground)",
                }}
                onClick={() => handleOpenChange(false)}
              >
                {t.profile.apiKeys.dialog.done}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="mb-[22px] flex-row items-center justify-between">
              <DialogTitle className="font-sans text-[18px] font-extrabold text-foreground">
                {t.profile.apiKeys.dialog.title}
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
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    value.trim().length === 0
                      ? t.profile.apiKeys.dialog.nameRequired
                      : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className={fieldLabelClassName}>
                      {t.profile.apiKeys.dialog.nameLabel}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      autoComplete="off"
                      placeholder={t.profile.apiKeys.dialog.namePlaceholder}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
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
                  className="h-auto rounded-[9px] px-[18px] py-[11px] text-[13px] font-bold text-muted-foreground hover:bg-transparent hover:text-foreground"
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
                      {t.profile.apiKeys.dialog.create}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
