"use client";

import type { ReactNode } from "react";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { useT } from "@/lib/i18n/locale-provider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const t = useT();
  const { session, isPending } = useRequireAuth();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
