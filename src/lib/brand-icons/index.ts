import { BRAND_ICON_INDEX, normalizeCompanyKey } from "./catalog";
import type { BrandIcon } from "./catalog";

export type { BrandIcon };
export { normalizeCompanyKey };

/**
 * Cherche le logo correspondant à un nom d'entreprise saisi par l'utilisateur.
 * La correspondance est exacte *après normalisation* : `"Stripe"`, `"stripe"`,
 * `"Stripe Inc."` et `"STRIPE, SAS"` tombent toutes sur la même icône.
 *
 * On ne fait volontairement **pas** de correspondance approximative (préfixe,
 * distance d'édition) : afficher le logo Apple sur une candidature chez
 * « Apple Tree Studio » serait pire que de n'afficher aucun logo.
 *
 * @returns l'icône, ou `null` si l'entreprise n'est pas dans la banque.
 */
export function findBrandIcon(company: string): BrandIcon | null {
  const key = normalizeCompanyKey(company);
  if (key === "") return null;
  return BRAND_ICON_INDEX.get(key) ?? null;
}
