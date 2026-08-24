"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { listApiKeysAction, revokeApiKeyAction } from "@/app/actions/api-key";
import { ActionError, actionErrorMessage } from "@/lib/i18n/errors";
import { dateLocales } from "@/lib/i18n/date-locales";
import { useLocale, useT } from "@/lib/i18n/locale-provider";
import type { ApiKeySummary } from "@/services/api-key";

import { ApiKeyDialog } from "./api-key-dialog";
import { ModifyButton } from "./modify-button";
import { SpotlightCard } from "./spotlight-card";

const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-muted-foreground";
const rowClassName =
  "flex items-center justify-between rounded-[12px] bg-muted px-[18px] py-[14px] text-[14px] text-foreground";

interface ApiKeysCardProps {
  initialKeys: ApiKeySummary[];
  mcpEndpoint: string;
}

export function ApiKeysCard({ initialKeys, mcpEndpoint }: ApiKeysCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeysAction,
    initialData: initialKeys,
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await revokeApiKeyAction(id);
      if (!result.ok) throw new ActionError(result.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success(t.profile.toasts.apiKeyRevoked);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(t, error));
    },
  });

  const keys = keysQuery.data.filter((key) => key.revokedAt === null);

  return (
    <SpotlightCard>
      <div className="mb-[18px] flex items-center justify-between">
        <div className={sectionLabelClassName}>{t.profile.apiKeys.title}</div>
        <ModifyButton
          onClick={() => setDialogOpen(true)}
          className="px-4 py-2 text-[13px]"
        />
      </div>

      <p className="mb-4 text-[12.5px] text-muted-foreground">
        {t.profile.apiKeys.description}
      </p>

      <div className={`${rowClassName} mb-3`}>
        <span className="text-muted-foreground">
          {t.profile.apiKeys.endpointLabel}
        </span>
        <code className="text-[12.5px] font-semibold">{mcpEndpoint}</code>
      </div>

      <div className="flex flex-col gap-3">
        {keys.length === 0 && (
          <div className={rowClassName}>
            <span className="text-muted-foreground">
              {t.profile.apiKeys.emptyState}
            </span>
          </div>
        )}
        {keys.map((key) => (
          <div key={key.id} className={rowClassName}>
            <div className="min-w-0">
              <div className="truncate font-bold">{key.name}</div>
              <div className="text-[11.5px] text-muted-foreground">
                {key.lastUsedAt
                  ? t.profile.apiKeys.lastUsed(
                      formatDistanceToNow(key.lastUsedAt, {
                        addSuffix: true,
                        locale: dateLocales[locale],
                      }),
                    )
                  : t.profile.apiKeys.neverUsed}
              </div>
            </div>
            <button
              type="button"
              onClick={() => revokeMutation.mutate(key.id)}
              disabled={revokeMutation.isPending}
              aria-label={t.profile.apiKeys.remove}
              className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </SpotlightCard>
  );
}
