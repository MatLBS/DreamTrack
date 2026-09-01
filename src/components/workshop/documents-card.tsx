"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteDocumentAction } from "@/app/actions/document";
import { ModifyButton } from "@/components/profile/modify-button";
import { SpotlightCard } from "@/components/profile/spotlight-card";
import type { WorkshopDocumentRow } from "@/db/schema";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { dateLocales } from "@/lib/i18n/date-locales";
import { useLocale, useT } from "@/lib/i18n/locale-provider";

import { DocumentUploadDialog } from "./document-upload-dialog";
import { WORKSHOP_DOCUMENTS_QUERY_KEY } from "./query-keys";

const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-muted-foreground";
const rowClassName =
  "flex items-center justify-between gap-3 rounded-[12px] bg-muted px-[18px] py-[14px] text-[14px] text-foreground";

const STATUS_DOT_CLASSNAME: Record<WorkshopDocumentRow["status"], string> = {
  ready: "bg-emerald-500",
  failed: "bg-destructive",
};

interface DocumentsCardProps {
  documents: WorkshopDocumentRow[];
}

export function DocumentsCard({ documents }: DocumentsCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDocumentAction(id);
      if (!result.ok) throw new ActionError(result.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSHOP_DOCUMENTS_QUERY_KEY });
      toast.success(t.workshop.toasts.documentDeleted);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  function statusLabel(document: WorkshopDocumentRow): string {
    if (document.status === "ready") {
      return t.workshop.documents.chunkCount(document.chunkCount);
    }
    return document.errorMessage ?? t.workshop.documents.status.failed;
  }

  return (
    <SpotlightCard>
      <div className="mb-[18px] flex items-center justify-between">
        <div className={sectionLabelClassName}>
          {t.workshop.documents.title}
        </div>
        <ModifyButton
          onClick={() => setDialogOpen(true)}
          className="px-4 py-2 text-[13px]"
        />
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[12px] bg-muted px-[18px] py-10 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="text-[14px] font-bold text-foreground">
            {t.workshop.documents.emptyTitle}
          </p>
          <p className="max-w-xs text-[12.5px] text-muted-foreground">
            {t.workshop.documents.emptyDescription}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((document) => (
            <div key={document.id} className={rowClassName}>
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASSNAME[document.status]}`}
                />
                <div className="min-w-0">
                  <div className="truncate font-bold">{document.title}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">
                    {formatDistanceToNow(document.createdAt, {
                      addSuffix: true,
                      locale: dateLocales[locale],
                    })}{" "}
                    · {statusLabel(document)}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(document.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={t.workshop.documents.deleteAria}
                  className="flex size-7 items-center justify-center rounded-[8px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DocumentUploadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </SpotlightCard>
  );
}
