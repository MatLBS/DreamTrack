"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-provider";

interface ModifyButtonProps {
  onClick: () => void;
  className?: string;
}

export function ModifyButton({ onClick, className }: ModifyButtonProps) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[9px] border border-[#e6e6ea] px-6 py-[14px] text-[17px] font-bold text-[#14161c] transition-colors hover:bg-[#f7f7f8]",
        className,
      )}
    >
      {t.profile.modify}
    </button>
  );
}
