"use client";

import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  /** Classes applied to the inner content wrapper (layout classes like flex/gap). */
  className?: string;
  /** Diameter of the glow in pixels. */
  spotlightSize?: number;
}

export function SpotlightCard({
  children,
  className,
  spotlightSize = 540,
}: SpotlightCardProps) {
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const glow = glowRef.current;
    if (!glow) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    glow.style.transform = `translate3d(${x - spotlightSize / 2}px, ${y - spotlightSize / 2}px, 0)`;
  };

  const handleMouseEnter = () => {
    if (glowRef.current) glowRef.current.style.opacity = "1";
  };

  const handleMouseLeave = () => {
    if (glowRef.current) glowRef.current.style.opacity = "0";
  };

  return (
    <div
      className="relative overflow-hidden rounded-[16px] border border-border bg-card p-[44px]"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 rounded-full opacity-0 transition-opacity duration-300 ease-out"
        style={{
          width: spotlightSize,
          height: spotlightSize,
          background:
            "radial-gradient(circle closest-side, color-mix(in srgb, #f97316 20%, transparent) 0%, color-mix(in srgb, #f97316 8%, transparent) 45%, transparent 70%)",
        }}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}
