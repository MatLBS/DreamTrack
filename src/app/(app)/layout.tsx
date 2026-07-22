import type { ReactNode } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { BubbleNav } from "@/components/nav/bubble-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <BubbleNav />
      <CommandPalette />
      {children}
    </RequireAuth>
  );
}
