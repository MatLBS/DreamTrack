"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Kanban, Monitor, Moon, Radar, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useT } from "@/lib/i18n/locale-provider";

const THEME_OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

export function CommandPalette() {
  const t = useT();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((isOpen) => !isOpen);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function goTo(href: string) {
    router.push(href);
    setOpen(false);
  }

  const themeLabels: Record<(typeof THEME_OPTIONS)[number]["value"], string> = {
    light: t.profile.accountSettings.themeLight,
    dark: t.profile.accountSettings.themeDark,
    system: t.profile.accountSettings.themeSystem,
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t.commandPalette.placeholder}
      description={t.commandPalette.placeholder}
    >
      <CommandInput placeholder={t.commandPalette.placeholder} />
      <CommandList>
        <CommandEmpty>{t.commandPalette.empty}</CommandEmpty>

        <CommandGroup heading={t.commandPalette.groupNavigation}>
          <CommandItem
            value={t.nav.applicationTrack}
            onSelect={() => goTo("/application-track")}
          >
            <Kanban />
            {t.nav.applicationTrack}
          </CommandItem>
          <CommandItem value={t.nav.aiWatch} onSelect={() => goTo("/ai-watch")}>
            <Radar />
            {t.nav.aiWatch}
          </CommandItem>
          <CommandItem value={t.nav.profile} onSelect={() => goTo("/profile")}>
            <User />
            {t.nav.profile}
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading={t.commandPalette.groupTheme}>
          {THEME_OPTIONS.map(({ value, icon: Icon }) => (
            <CommandItem
              key={value}
              value={themeLabels[value]}
              onSelect={() => {
                setTheme(value);
                setOpen(false);
              }}
            >
              <Icon />
              {themeLabels[value]}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
