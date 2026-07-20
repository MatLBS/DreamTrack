"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { saveLlmCredentialAction } from "@/app/actions/llm-credential";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";
import {
  LLM_PROVIDERS,
  type LlmProvider,
} from "@/lib/validation/llm-credential";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";
const fieldInputClassName =
  "h-auto rounded-[9px] border-[1.5px] border-input bg-muted px-[14px] py-[11px] text-[13.5px] text-foreground shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-0";

interface LlmKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProvider?: LlmProvider;
}

interface LlmKeyFormValues {
  provider: LlmProvider;
  apiKey: string;
}

export function LlmKeyDialog({
  open,
  onOpenChange,
  currentProvider,
}: LlmKeyDialogProps) {
  const t = useT();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: LlmKeyFormValues) => {
      const result = await saveLlmCredentialAction({
        provider: values.provider,
        apiKey: values.apiKey.trim(),
      });
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-credential-summary"] });
      toast.success(t.profile.toasts.llmKeySaved);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const form = useForm({
    defaultValues: {
      provider: currentProvider ?? "anthropic",
      apiKey: "",
    } as LlmKeyFormValues,
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
            {t.profile.llmKey.dialog.title}
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
          <form.Field name="provider">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.profile.llmKey.dialog.providerLabel}
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as LlmProvider)
                  }
                >
                  <SelectTrigger
                    id={field.name}
                    className={`${fieldInputClassName} w-full justify-between`}
                  >
                    <SelectValue>
                      {(value: LlmProvider | null) =>
                        value ? t.profile.llmKey.providers[value] : ""
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {t.profile.llmKey.providers[provider]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field
            name="apiKey"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0
                  ? t.profile.llmKey.dialog.apiKeyRequired
                  : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.profile.llmKey.dialog.apiKeyLabel}
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="off"
                  placeholder={t.profile.llmKey.dialog.apiKeyPlaceholder}
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
                  {t.profile.llmKey.dialog.save}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
