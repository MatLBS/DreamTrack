"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Kanban, Menu, Radar, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: keyof Dictionary["nav"];
  icon: typeof Kanban;
  top: number;
  x: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/ai-watch", labelKey: "aiWatch", icon: Radar, top: 64, x: -70 },
  {
    href: "/application-track",
    labelKey: "applicationTrack",
    icon: Kanban,
    top: 96,
    x: 0,
  },
  { href: "/profile", labelKey: "profile", icon: User, top: 64, x: 70 },
];

function subscribeToHoverCapability(onChange: () => void) {
  const mediaQuery = window.matchMedia("(hover: hover)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getHoverCapability() {
  return window.matchMedia("(hover: hover)").matches;
}

export function BubbleNav() {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const hasHover = useSyncExternalStore(
    subscribeToHoverCapability,
    getHoverCapability,
    () => true,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const satelliteRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const satellites = satelliteRefs.current.filter(
      (el): el is HTMLAnchorElement => el !== null,
    );
    if (satellites.length === 0) return;

    gsap.killTweensOf(satellites);

    if (isOpen) {
      gsap.set(satellites, { scale: 0, opacity: 0 });
      gsap.to(satellites, {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: "back.out(1.6)",
        stagger: 0.08,
      });
    } else {
      gsap.to(satellites, {
        scale: 0,
        opacity: 0,
        duration: 0.15,
        ease: "power3.in",
        stagger: 0.04,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (hasHover || !isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasHover, isOpen]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <div
        ref={wrapperRef}
        className="pointer-events-auto relative flex h-40 w-52 items-start justify-center"
        onMouseEnter={hasHover ? () => setIsOpen(true) : undefined}
        onMouseLeave={hasHover ? () => setIsOpen(false) : undefined}
      >
        <button
          type="button"
          aria-label={t.nav.openNav}
          aria-expanded={isOpen}
          onClick={hasHover ? undefined : () => setIsOpen((open) => !open)}
          className="relative z-10 flex size-14 items-center justify-center rounded-full border bg-card shadow-lg transition-transform active:scale-95"
        >
          <Menu className="size-5 text-foreground" />
        </button>

        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const label = t.nav[item.labelKey];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={label}
              aria-hidden={!isOpen}
              tabIndex={isOpen ? 0 : -1}
              ref={(el) => {
                satelliteRefs.current[index] = el;
              }}
              onClick={hasHover ? undefined : () => setIsOpen(false)}
              className={cn(
                "group absolute -ml-6 flex size-12 scale-0 items-center justify-center rounded-full border bg-card opacity-0 shadow-md",
                isOpen ? "pointer-events-auto" : "pointer-events-none",
              )}
              style={{ top: item.top, left: `calc(50% + ${item.x}px)` }}
            >
              <Icon className="size-5 text-foreground" />
              <span className="pointer-events-none absolute top-full mt-1.5 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
