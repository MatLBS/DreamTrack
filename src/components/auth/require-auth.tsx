"use client";

import type { ReactNode } from "react";

import { useRequireAuth } from "@/hooks/use-require-auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isPending } = useRequireAuth();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
