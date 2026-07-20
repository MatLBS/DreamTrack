"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { LOCALES } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/locale-provider";

import { SpotlightCard } from "./spotlight-card";

const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-muted-foreground";
const rowClassName =
  "flex items-center justify-between rounded-[12px] bg-muted px-[18px] py-[14px] text-[14px] text-foreground";

const THEME_OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

function subscribeNever() {
  return () => {};
}

function getMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

/** next-themes only knows the real theme client-side; this avoids a hydration mismatch on first paint. */
function useMounted() {
  return useSyncExternalStore(
    subscribeNever,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );
}

export function AccountSettingsCard() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const themeLabels: Record<(typeof THEME_OPTIONS)[number]["value"], string> = {
    light: t.profile.accountSettings.themeLight,
    dark: t.profile.accountSettings.themeDark,
    system: t.profile.accountSettings.themeSystem,
  };

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
          <span>{t.profile.accountSettings.themeLabel}</span>
          <div className="flex rounded-[9px] border border-border bg-popover p-1">
            {THEME_OPTIONS.map(({ value, icon: Icon }) => {
              const isActive = mounted && theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-label={themeLabels[value]}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[7px] px-[14px] py-1.5 text-[12.5px] font-bold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{themeLabels[value]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={rowClassName}>
          <span>{t.profile.accountSettings.languageLabel}</span>
          <div className="flex rounded-[9px] border border-border bg-popover p-1">
            {LOCALES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
                className={cn(
                  "rounded-[7px] px-[14px] py-1.5 text-[12.5px] font-bold uppercase transition-colors",
                  locale === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
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
            "w-full text-left font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60",
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
