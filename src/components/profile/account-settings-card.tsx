"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en";

const LOCALE_STORAGE_KEY = "locale";

const cardClassName =
  "rounded-[16px] border border-[#e6e6ea] bg-white p-[28px]";
const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-[#6b6b76]";
const rowClassName =
  "flex items-center justify-between rounded-[12px] bg-[#f7f7f8] px-[18px] py-[14px] text-[14px] text-[#3a3a42]";

export function AccountSettingsCard() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "fr";
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "en" ? "en" : "fr";
  });
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLocaleChange = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    router.push("/login");
  };

  return (
    <div className={cardClassName}>
      <div className={sectionLabelClassName}>PARAMÈTRES DU COMPTE</div>
      <div className="flex flex-col gap-3">
        <div className={rowClassName}>
          <span>Langue</span>
          <div className="flex rounded-[9px] border border-[#e6e6ea] bg-white p-1">
            {(["fr", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleLocaleChange(option)}
                suppressHydrationWarning
                className={cn(
                  "rounded-[7px] px-[14px] py-1.5 text-[12.5px] font-bold uppercase transition-colors",
                  locale === option
                    ? "bg-[#14161c] text-white"
                    : "text-[#6b6b76] hover:bg-[#f7f7f8]",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={cn(
            rowClassName,
            "w-full text-left font-bold text-[#b3261e] transition-colors hover:bg-[#f9e9e8] disabled:opacity-60",
          )}
        >
          <span className="flex items-center gap-2">
            <LogOut className="size-4" />
            Se déconnecter
          </span>
        </button>
      </div>
    </div>
  );
}
