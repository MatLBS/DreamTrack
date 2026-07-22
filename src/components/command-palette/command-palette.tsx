"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Kanban, Monitor, Moon, Plus, Radar, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import { getBoardAction } from "@/app/actions/board";
import { CompanyLogo } from "@/components/brand/company-logo";
import { ApplicationDialog } from "@/components/kanban/application-dialog";
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const boardQuery = useQuery({
    queryKey: ["board"],
    queryFn: getBoardAction,
    enabled: open,
  });

  const searchableApplications = useMemo(
    () =>
      (boardQuery.data ?? []).flatMap((column) =>
        column.applications.map((application) => ({
          ...application,
          columnName: column.name,
        })),
      ),
    [boardQuery.data],
  );

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
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t.commandPalette.placeholder}
        description={t.commandPalette.placeholder}
      >
        <CommandInput placeholder={t.commandPalette.placeholder} />
        <CommandList>
          <CommandEmpty>{t.commandPalette.empty}</CommandEmpty>

          <CommandGroup heading={t.commandPalette.groupActions}>
            <CommandItem
              value={t.commandPalette.createApplication}
              onSelect={() => {
                setOpen(false);
                setCreateDialogOpen(true);
              }}
            >
              <Plus />
              {t.commandPalette.createApplication}
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading={t.commandPalette.groupNavigation}>
            <CommandItem
              value={t.nav.applicationTrack}
              onSelect={() => goTo("/application-track")}
            >
              <Kanban />
              {t.nav.applicationTrack}
            </CommandItem>
            <CommandItem
              value={t.nav.aiWatch}
              onSelect={() => goTo("/ai-watch")}
            >
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

          {searchableApplications.length > 0 && (
            <CommandGroup heading={t.commandPalette.groupApplications}>
              {searchableApplications.map((application) => (
                <CommandItem
                  key={application.id}
                  value={`${application.company} ${application.role}`}
                  onSelect={() => goTo("/application-track")}
                >
                  <CompanyLogo
                    company={application.company}
                    iconUrl={application.iconUrl}
                  />
                  <span className="flex flex-1 items-baseline gap-1.5 truncate">
                    <span className="font-medium">{application.company}</span>
                    <span className="truncate text-muted-foreground">
                      {application.role}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {application.columnName}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <ApplicationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
