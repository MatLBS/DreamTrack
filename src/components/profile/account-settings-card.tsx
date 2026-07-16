"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { LOCALES } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/locale-provider";

import { SpotlightCard } from "./spotlight-card";

const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-[#6b6b76]";
const rowClassName =
  "flex items-center justify-between rounded-[12px] bg-[#f7f7f8] px-[18px] py-[14px] text-[14px] text-[#3a3a42]";

export function AccountSettingsCard() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    router.push("/login");
  };

  return (
    <SpotlightCard>
      <div className={sectionLabelClassName}>
        {t.profile.accountSettings.title}
      </div>
      <div className="flex flex-col gap-3">
        <div className={rowClassName}>
          <span>{t.profile.accountSettings.languageLabel}</span>
          <div className="flex rounded-[9px] border border-[#e6e6ea] bg-white p-1">
            {LOCALES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
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
            {t.profile.accountSettings.signOut}
          </span>
        </button>
      </div>
    </SpotlightCard>
  );
}
