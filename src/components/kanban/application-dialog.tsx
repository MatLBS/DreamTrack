"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, XIcon } from "lucide-react";
import { toast } from "sonner";

import {
  createApplicationAction,
  updateApplicationAction,
} from "@/app/actions/application";
import { importJobFromUrlAction } from "@/app/actions/job-import";
import { CompanyLogo } from "@/components/brand/company-logo";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Application } from "@/db/schema";
import { findBrandIcon } from "@/lib/brand-icons";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

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
  const t = useT();
  const queryClient = useQueryClient();
  const isEdit = Boolean(application);
  const [activeTab, setActiveTab] = useState<"manual" | "import">("manual");
  const [importUrl, setImportUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const previewUrl = useMemo(
    () => (iconFile ? URL.createObjectURL(iconFile) : null),
    [iconFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setActiveTab("manual");
      setImportUrl("");
      setIconFile(null);
      setRemoveIcon(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(next);
  }

  const importMutation = useMutation({
    mutationFn: async (url: string) => {
      const result = await importJobFromUrlAction({ url });
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: (draft) => {
      form.setFieldValue("company", draft.company);
      form.setFieldValue("role", draft.role);
      form.setFieldValue("url", draft.url);
      form.setFieldValue("notes", draft.notes ?? "");
      toast.success(t.kanban.dialogs.application.import.success);
      setActiveTab("manual");
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ApplicationFormValues) => {
      const formData = new FormData();
      formData.set("company", values.company);
      formData.set("role", values.role);
      formData.set("url", values.url);
      formData.set("notes", values.notes);
      if (!application && defaultColumnId) {
        formData.set("columnId", defaultColumnId);
      }
      if (iconFile) formData.set("icon", iconFile);
      else if (removeIcon) formData.set("removeIcon", "1");

      const result = application
        ? await updateApplicationAction(application.id, formData)
        : await createApplicationAction(formData);

      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      if (!isEdit) queryClient.invalidateQueries({ queryKey: ["sankey"] });
      toast.success(
        isEdit
          ? t.kanban.toasts.applicationUpdated
          : t.kanban.toasts.applicationCreated,
      );
      handleOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-[16px] bg-white pt-[26px] pr-[28px] pb-[22px] pl-[28px] text-[#14161c] shadow-[0_20px_50px_rgba(20,20,20,0.18)] ring-0 sm:max-w-[420px]"
      >
        <DialogHeader className="mb-[22px] flex-row items-center justify-between">
          <DialogTitle className="font-sans text-[18px] font-extrabold text-[#14161c]">
            {isEdit
              ? t.kanban.dialogs.application.titleEdit
              : t.kanban.dialogs.application.titleAdd}
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

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "manual" | "import")}
        >
          {!isEdit && (
            <TabsList className="mb-[18px] w-full">
              <TabsTrigger value="manual" className="flex-1">
                {t.kanban.dialogs.application.tabManual}
              </TabsTrigger>
              <TabsTrigger value="import" className="flex-1">
                {t.kanban.dialogs.application.tabImport}
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="manual">
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
                      ? t.kanban.dialogs.application.companyRequired
                      : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className={fieldLabelClassName}>
                      {t.kanban.dialogs.application.companyLabel}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder={
                        t.kanban.dialogs.application.companyPlaceholder
                      }
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

              <div className="space-y-1.5">
                <Label className={fieldLabelClassName}>
                  {t.kanban.dialogs.application.iconLabel}
                </Label>
                <form.Subscribe selector={(state) => state.values.company}>
                  {(company) => {
                    const effectiveIconUrl =
                      previewUrl ??
                      (removeIcon ? null : (application?.iconUrl ?? null));
                    const hasVisibleIcon =
                      Boolean(effectiveIconUrl) ||
                      Boolean(findBrandIcon(company));
                    const canRemove =
                      Boolean(iconFile) ||
                      (Boolean(application?.iconUrl) && !removeIcon);

                    return (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          aria-label={
                            t.kanban.dialogs.application.iconChooseAria
                          }
                          className="group relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-[1.5px] border-[#d5d5db] bg-[#fafafb]"
                        >
                          {hasVisibleIcon ? (
                            <CompanyLogo
                              company={company}
                              iconUrl={effectiveIconUrl}
                              className="size-full rounded-none bg-transparent"
                            />
                          ) : (
                            <ImagePlus className="size-5 text-[#9a9aa3]" />
                          )}
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <Camera className="size-4 text-white" />
                          </span>
                        </button>
                        <div className="flex flex-col items-start gap-1">
                          <p className="text-[11px] text-[#9a9aa3]">
                            {t.kanban.dialogs.application.iconHint}
                          </p>
                          {canRemove && (
                            <button
                              type="button"
                              onClick={() => {
                                setIconFile(null);
                                setRemoveIcon(true);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                              className="text-[11px] font-bold text-[#7F1734] hover:underline"
                            >
                              {t.kanban.dialogs.application.iconRemove}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }}
                </form.Subscribe>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setIconFile(file);
                      setRemoveIcon(false);
                    }
                  }}
                />
              </div>

              <form.Field
                name="role"
                validators={{
                  onChange: ({ value }) =>
                    value.trim().length === 0
                      ? t.kanban.dialogs.application.roleRequired
                      : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className={fieldLabelClassName}>
                      {t.kanban.dialogs.application.roleLabel}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder={t.kanban.dialogs.application.rolePlaceholder}
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

              <form.Field
                name="url"
                validators={{
                  onChange: ({ value }) => {
                    if (value.trim() === "") return undefined;
                    try {
                      new URL(value);
                      return undefined;
                    } catch {
                      return t.kanban.dialogs.application.urlInvalid;
                    }
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className={fieldLabelClassName}>
                      {t.kanban.dialogs.application.urlLabel}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder={t.kanban.dialogs.application.urlPlaceholder}
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

              <form.Field name="notes">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className={fieldLabelClassName}>
                      {t.kanban.dialogs.application.notesLabel}
                    </Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      rows={3}
                      placeholder={
                        t.kanban.dialogs.application.notesPlaceholder
                      }
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
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
                      {isEdit
                        ? t.kanban.dialogs.application.save
                        : t.kanban.dialogs.application.add}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form>
          </TabsContent>

          {!isEdit && (
            <TabsContent value="import">
              <div className="space-y-[18px]">
                <div className="space-y-1.5">
                  <Label htmlFor="import-url" className={fieldLabelClassName}>
                    {t.kanban.dialogs.application.import.urlLabel}
                  </Label>
                  <Input
                    id="import-url"
                    placeholder={
                      t.kanban.dialogs.application.import.urlPlaceholder
                    }
                    value={importUrl}
                    onChange={(event) => setImportUrl(event.target.value)}
                    className={fieldInputClassName}
                  />
                </div>

                <DialogFooter className="m-0 flex-row justify-end gap-[10px] rounded-none border-0 bg-transparent p-0 pt-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto rounded-[9px] px-[18px] py-[11px] text-[13px] font-bold text-[#6b6b76] hover:bg-transparent hover:text-[#14161c]"
                    onClick={() => handleOpenChange(false)}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      importUrl.trim() === "" || importMutation.isPending
                    }
                    onClick={() => importMutation.mutate(importUrl.trim())}
                    className="h-auto rounded-[9px] px-5 py-[11px] text-[13px] font-bold hover:opacity-90"
                    style={{
                      backgroundColor: "var(--brand)",
                      color: "var(--brand-foreground)",
                    }}
                  >
                    {importMutation.isPending && (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    )}
                    {importMutation.isPending
                      ? t.kanban.dialogs.application.import.analyzing
                      : t.kanban.dialogs.application.import.analyze}
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
