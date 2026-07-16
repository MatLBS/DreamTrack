import { fr, enUS } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

import type { Locale } from "./config";

export const dateLocales: Record<Locale, DateFnsLocale> = { fr, en: enUS };
