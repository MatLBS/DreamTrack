export type Locale = "fr" | "en";

export const LOCALES: readonly Locale[] = ["fr", "en"] as const;

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_STORAGE_KEY = "locale";

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
}
