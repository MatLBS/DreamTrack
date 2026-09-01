"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import { Button } from "./ui/button";

interface ThemeToggleButtonProps {
  shape?:
    | "circle"
    | "square"
    | "triangle"
    | "diamond"
    | "rectangle"
    | "hexagon"
    | "star";
  direction?: "ltr" | "rtl" | "ttb" | "btt";
}

export function ThemeToggleButton({
  shape = "circle",
  direction = "ltr",
}: ThemeToggleButtonProps) {
  return (
    <AnimatedThemeToggler shape={shape} direction={direction}>
      {({ resolvedTheme, toggleTheme }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => toggleTheme(e)}
          aria-label={
            resolvedTheme === "dark"
              ? "Passer au mode clair"
              : "Passer au mode sombre"
          }
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      )}
    </AnimatedThemeToggler>
  );
}
