import { findBrandIcon } from "@/lib/brand-icons";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  company: string;
  /** Icône uploadée pour cette carte (`applications.iconUrl`) — prime sur le logo auto-détecté. */
  iconUrl?: string | null;
  className?: string;
}

/**
 * Pastille de logo d'une entreprise : l'icône uploadée par l'utilisateur si
 * elle existe, sinon le logo officiel s'il est dans la banque d'icônes. Sinon
 * on ne rend **rien** : la carte garde son apparence d'origine plutôt que
 * d'afficher un placeholder qui ajouterait du bruit visuel.
 *
 * Exception assumée à la règle « pas de SVG inline » : un logo de marque est un
 * tracé propre à l'entreprise, il n'existe pas d'équivalent Lucide.
 */
export function CompanyLogo({ company, iconUrl, className }: CompanyLogoProps) {
  if (iconUrl) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt="" className="size-full object-contain" />
      </span>
    );
  }

  const icon = findBrandIcon(company);
  if (!icon) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md",
        className,
      )}
      style={{ backgroundColor: `#${icon.hex}1f` }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        // Les marques très sombres (Apple, X…) deviennent invisibles en thème
        // sombre : on retombe alors sur la couleur de texte courante.
        style={{ fill: isDarkHex(icon.hex) ? "currentColor" : `#${icon.hex}` }}
      >
        <path d={icon.path} />
      </svg>
    </span>
  );
}

/**
 * Luminance perçue (coefficients ITU-R BT.601) : en dessous du seuil, la couleur
 * de marque ne se détache plus sur un fond sombre.
 */
function isDarkHex(hex: string): boolean {
  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return (r * 299 + g * 587 + b * 114) / 1000 < 60;
}
