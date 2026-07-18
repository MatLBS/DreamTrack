import { format } from "date-fns";

export interface SankeyExportColors {
  positive: string;
  negative: string;
  foreground: string;
  background: string;
}

/** `sankey-2026-07-18.png` : nom stable, triable, sans caractères à échapper. */
export function sankeyExportFilename(date: Date, extension: string): string {
  return `sankey-${format(date, "yyyy-MM-dd")}.${extension}`;
}

/**
 * Rend le SVG du Sankey autonome : la version issue de `outerHTML` référence les
 * couleurs via `var(--sankey-positive)` et des classes Tailwind (`fill-foreground`)
 * qui n'existent plus une fois le SVG ouvert hors de la page (fichier téléchargé,
 * `<img>` sur un blob). On fige donc les couleurs et on rajoute un `<style>` interne
 * pour le texte, plus un fond opaque pour éviter un export transparent.
 */
export function buildExportableSvgMarkup(
  svgOuterHTML: string,
  width: number,
  height: number,
  colors: SankeyExportColors,
): string {
  let markup = svgOuterHTML
    .replaceAll("var(--sankey-positive)", colors.positive)
    .replaceAll("var(--sankey-negative)", colors.negative);

  if (!markup.includes("xmlns=")) {
    markup = markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const style = `<style>text{font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;font-weight:500;fill:${colors.foreground};}</style>`;
  const background = `<rect x="0" y="0" width="${width}" height="${height}" fill="${colors.background}" />`;

  const openTagEnd = markup.indexOf(">") + 1;
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    markup.slice(0, openTagEnd) +
    style +
    background +
    markup.slice(openTagEnd)
  );
}
