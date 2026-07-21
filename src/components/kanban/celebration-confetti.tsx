"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Confetti from "react-confetti-boom";

const DURATION_MS = 9000;

interface CelebrationConfettiProps {
  onFinished: () => void;
}

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getPrefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Pluie de confettis plein écran (mode "fall" = spawn continu tant que monté).
 * `onFinished` est lu via ref pour ne pas relancer le timer à chaque re-render
 * du parent (le board se re-render souvent pendant l'invalidation des queries).
 * Ne s'anime pas si l'utilisateur a activé `prefers-reduced-motion`.
 */
export function CelebrationConfetti({ onFinished }: CelebrationConfettiProps) {
  const onFinishedRef = useRef(onFinished);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getPrefersReducedMotion,
    () => false,
  );

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (prefersReducedMotion) {
      onFinishedRef.current();
      return;
    }
    const timeout = setTimeout(() => onFinishedRef.current(), DURATION_MS);
    return () => clearTimeout(timeout);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      <Confetti mode="fall" particleCount={250} />
    </div>
  );
}
