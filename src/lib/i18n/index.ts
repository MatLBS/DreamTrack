import { fr } from "./fr";
import { en } from "./en";
import type { Locale } from "./config";

export type Dictionary = typeof fr;

export const dictionaries: Record<Locale, Dictionary> = { fr, en };

export * from "./config";
