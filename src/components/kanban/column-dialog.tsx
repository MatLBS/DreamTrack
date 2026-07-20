"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { createColumnAction } from "@/app/actions/column";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Column } from "@/db/schema";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";
const fieldInputClassName =
  "h-auto rounded-[9px] border-[1.5px] border-input bg-muted px-[14px] py-[11px] text-[13.5px] text-foreground shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-0";

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
  const t = useT();
  const queryClient = useQueryClient();
  const predecessors = getInsertablePredecessors(columns);
  const defaultAfterColumnId = predecessors.at(-1)?.id ?? "";

  const mutation = useMutation({
    mutationFn: async (values: ColumnFormValues) => {
      const afterColumn = predecessors.find(
        (c) => c.id === values.afterColumnId,
      );
      if (!afterColumn) throw new Error("Reference column not found");

      const result = await createColumnAction({
        name: values.name.trim(),
        index: afterColumn.position + 1,
        isLostStage: !values.advancesCandidacy,
      });

      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["sankey"] });
      toast.success(t.kanban.toasts.columnCreated);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
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
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-[16px] bg-popover pt-[26px] pr-[28px] pb-[22px] pl-[28px] text-foreground shadow-[0_20px_50px_rgba(20,20,20,0.18)] ring-0 sm:max-w-[420px]"
      >
        <DialogHeader className="mb-[22px] flex-row items-center justify-between">
          <DialogTitle className="font-sans text-[18px] font-extrabold text-foreground">
            {t.kanban.dialogs.column.title}
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
                  ? t.kanban.dialogs.column.nameRequired
                  : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.kanban.dialogs.column.nameLabel}
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder={t.kanban.dialogs.column.namePlaceholder}
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

          <form.Field name="afterColumnId">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name} className={fieldLabelClassName}>
                  {t.kanban.dialogs.column.afterLabel}
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as string)}
                >
                  <SelectTrigger
                    id={field.name}
                    className={`${fieldInputClassName} w-full justify-between`}
                  >
                    <SelectValue
                      placeholder={t.kanban.dialogs.column.choosePlaceholder}
                    >
                      {(value: string | null) =>
                        predecessors.find((c) => c.id === value)?.name ??
                        t.kanban.dialogs.column.choosePlaceholder
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
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                  className="size-[17px] rounded-[5px] border-input data-checked:border-[var(--brand)] data-checked:bg-[var(--brand)]"
                />
                <Label
                  htmlFor={field.name}
                  className="flex items-center gap-2 text-[13px] font-normal text-foreground"
                >
                  {t.kanban.dialogs.column.advancesLabel}
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
                  disabled={
                    !canSubmit || isSubmitting || predecessors.length === 0
                  }
                  className="h-auto rounded-[9px] px-5 py-[11px] text-[13px] font-bold hover:opacity-90"
                  style={{
                    backgroundColor: "var(--brand)",
                    color: "var(--brand-foreground)",
                  }}
                >
                  {t.kanban.dialogs.column.add}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
