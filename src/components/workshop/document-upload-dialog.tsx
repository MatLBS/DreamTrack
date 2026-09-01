"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { uploadDocumentAction } from "@/app/actions/document";
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
import type { DocumentKind } from "@/lib/validation/document";

import { WORKSHOP_DOCUMENTS_QUERY_KEY } from "./query-keys";

const MAX_BYTES = 10 * 1024 * 1024;

const fieldLabelClassName =
  "text-[11px] font-bold tracking-[0.3px] text-muted-foreground uppercase";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
}: DocumentUploadDialogProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<DocumentKind>("cv");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setKind("cv");
    setTitle("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleFileChange(selected: File | null) {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError(t.workshop.uploadDialog.unsupportedType);
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError(t.workshop.uploadDialog.tooLarge);
      return;
    }
    setError(null);
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.pdf$/i, ""));
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("title", title.trim() || file.name);
      formData.set("file", file);
      const result = await uploadDocumentAction(formData);
      if (!result.ok) throw new ActionError(result.code);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSHOP_DOCUMENTS_QUERY_KEY });
      toast.success(t.workshop.toasts.documentAdded);
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t.workshop.uploadDialog.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-[18px]">
          <div className="space-y-1.5">
            <Label className={fieldLabelClassName}>
              {t.workshop.uploadDialog.fileLabel}
            </Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex w-full items-center gap-3 rounded-[9px] border-[1.5px] border-dashed border-input bg-muted px-[14px] py-[11px] text-left text-[13.5px] text-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {file ? file.name : t.workshop.uploadDialog.chooseFile}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) =>
                handleFileChange(event.target.files?.[0] ?? null)
              }
            />
            <p className="text-[11px] text-muted-foreground">
              {t.workshop.uploadDialog.fileConstraint}
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className={fieldLabelClassName}>
              {t.workshop.uploadDialog.kindLabel}
            </Label>
            <Select
              value={kind}
              onValueChange={(value) => {
                if (value) setKind(value as DocumentKind);
              }}
              disabled={uploadMutation.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cv">
                  {t.workshop.documents.kinds.cv}
                </SelectItem>
                <SelectItem value="cover_letter">
                  {t.workshop.documents.kinds.cover_letter}
                </SelectItem>
                <SelectItem value="other">
                  {t.workshop.documents.kinds.other}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="document-title" className={fieldLabelClassName}>
              {t.workshop.uploadDialog.titleLabel}
            </Label>
            <Input
              id="document-title"
              placeholder={t.workshop.uploadDialog.titlePlaceholder}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={uploadMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>
            {t.common.cancel}
          </DialogClose>
          <Button
            type="button"
            disabled={!file || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {t.workshop.uploadDialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
