"use client";

import * as React from "react";
import { useTheme } from "next-themes";

type ClipPathShape =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "rectangle"
  | "hexagon"
  | "star";

type Direction = "ltr" | "rtl" | "ttb" | "btt";

interface AnimatedThemeTogglerProps {
  children: (props: {
    theme: string | undefined;
    resolvedTheme: string | undefined;
    toggleTheme: (event?: React.MouseEvent) => void;
  }) => React.ReactNode;
  shape?: ClipPathShape;
  direction?: Direction;
  className?: string;
}

const getClipPath = (
  shape: ClipPathShape,
  x: number,
  y: number,
  endRadius: number,
): string => {
  switch (shape) {
    case "circle":
      return `circle(${endRadius}px at ${x}px ${y}px)`;
    case "square":
      return `inset(${Math.max(0, y - endRadius)}px ${Math.max(0, window.innerWidth - x - endRadius)}px ${Math.max(0, window.innerHeight - y - endRadius)}px ${Math.max(0, x - endRadius)}px)`;
    case "triangle":
      return `polygon(${x}px ${y - endRadius}px, ${x - endRadius}px ${y + endRadius}px, ${x + endRadius}px ${y + endRadius}px)`;
    case "diamond":
      return `polygon(${x}px ${y - endRadius}px, ${x + endRadius}px ${y}px, ${x}px ${y + endRadius}px, ${x - endRadius}px ${y}px)`;
    case "rectangle": {
      const width = endRadius * 1.5;
      const height = endRadius;
      return `inset(${Math.max(0, y - height)}px ${Math.max(0, window.innerWidth - x - width)}px ${Math.max(0, window.innerHeight - y - height)}px ${Math.max(0, x - width)}px)`;
    }
    case "hexagon": {
      const r = endRadius;
      const h = r * Math.sin(Math.PI / 3);
      return `polygon(${x - r}px ${y}px, ${x - r / 2}px ${y - h}px, ${x + r / 2}px ${y - h}px, ${x + r}px ${y}px, ${x + r / 2}px ${y + h}px, ${x - r / 2}px ${y + h}px)`;
    }
    case "star": {
      const r = endRadius;
      const rInner = r / 2.5;
      const points = 5;
      const angleStep = (Math.PI * 2) / points;
      const offset = -Math.PI / 2;

      const outerPoints = Array.from({ length: points }, (_, i) => {
        const angle = i * angleStep + offset;
        return `${x + r * Math.cos(angle)}px ${y + r * Math.sin(angle)}px`;
      });

      const innerPoints = Array.from({ length: points }, (_, i) => {
        const angle = i * angleStep + offset + angleStep / 2;
        return `${x + rInner * Math.cos(angle)}px ${y + rInner * Math.sin(angle)}px`;
      });

      const allPoints: string[] = [];
      for (let i = 0; i < points; i++) {
        allPoints.push(outerPoints[i]!);
        allPoints.push(innerPoints[i]!);
      }

      return `polygon(${allPoints.join(", ")})`;
    }
    default:
      return `circle(${endRadius}px at ${x}px ${y}px)`;
  }
};

const getOriginFromDirection = (direction: Direction) => {
  switch (direction) {
    case "ltr":
      return { x: 0, y: window.innerHeight / 2 };
    case "rtl":
      return { x: window.innerWidth, y: window.innerHeight / 2 };
    case "ttb":
      return { x: window.innerWidth / 2, y: 0 };
    case "btt":
      return { x: window.innerWidth / 2, y: window.innerHeight };
  }
};

export function AnimatedThemeToggler({
  children,
  shape = "circle",
  direction = "ltr",
  className,
}: AnimatedThemeTogglerProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Required to prevent hydration mismatch between server and client
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const toggleTheme = React.useCallback(
    (event?: React.MouseEvent) => {
      const newTheme = resolvedTheme === "dark" ? "light" : "dark";

      // Check if View Transitions API is supported
      if (!document.startViewTransition || !mounted) {
        setTheme(newTheme);
        return;
      }

      // Get click position or use direction-based origin
      let x: number;
      let y: number;

      if (event) {
        x = event.clientX;
        y = event.clientY;
      } else {
        const origin = getOriginFromDirection(direction);
        x = origin.x;
        y = origin.y;
      }

      // Calculate the radius needed to cover the entire viewport
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      // Start view transition
      const transition = document.startViewTransition(() => {
        setTheme(newTheme);
      });

      // Animate the transition
      transition.ready.then(() => {
        const clipPath = getClipPath(shape, x, y, endRadius);

        document.documentElement.animate(
          {
            clipPath: ["circle(0px at " + x + "px " + y + "px)", clipPath],
          },
          {
            duration: 500,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      });
    },
    [resolvedTheme, setTheme, shape, direction, mounted],
  );

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className={className}>
      {children({ theme, resolvedTheme, toggleTheme })}
    </div>
  );
}
