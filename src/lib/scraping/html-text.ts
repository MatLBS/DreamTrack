const STRIPPED_TAGS = ["script", "style", "nav", "footer", "svg", "noscript"];

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  // Lettres accentuées latin-1 — indispensables pour les offres en français.
  eacute: "é",
  Eacute: "É",
  egrave: "è",
  Egrave: "È",
  ecirc: "ê",
  Ecirc: "Ê",
  euml: "ë",
  Euml: "Ë",
  agrave: "à",
  Agrave: "À",
  acirc: "â",
  Acirc: "Â",
  auml: "ä",
  Auml: "Ä",
  aring: "å",
  Aring: "Å",
  ccedil: "ç",
  Ccedil: "Ç",
  ocirc: "ô",
  Ocirc: "Ô",
  ouml: "ö",
  Ouml: "Ö",
  ograve: "ò",
  Ograve: "Ò",
  ucirc: "û",
  Ucirc: "Û",
  uuml: "ü",
  Uuml: "Ü",
  ugrave: "ù",
  Ugrave: "Ù",
  icirc: "î",
  Icirc: "Î",
  iuml: "ï",
  Iuml: "Ï",
  igrave: "ì",
  Igrave: "Ì",
  ntilde: "ñ",
  Ntilde: "Ñ",
  oelig: "œ",
  OElig: "Œ",
  aelig: "æ",
  AElig: "Æ",
  szlig: "ß",
  euro: "€",
  pound: "£",
  cent: "¢",
  copy: "©",
  reg: "®",
  trade: "™",
  middot: "·",
  laquo: "«",
  raquo: "»",
  deg: "°",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match);
}

function extractTagContent(html: string, tag: string): string | null {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return match ? decodeEntities(match[1]).trim() : null;
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return null;
}

function stripTags(html: string): string {
  let stripped = html;
  for (const tag of STRIPPED_TAGS) {
    stripped = stripped.replace(
      new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi"),
      " ",
    );
  }
  stripped = stripped.replace(/<head[^>]*>[\s\S]*?<\/head>/i, " ");
  return stripped.replace(/<[^>]+>/g, " ");
}

/**
 * Convertit du HTML brut en texte simple pour un LLM. Fonction pure, sans I/O,
 * sans aucune règle spécifique à un site — le titre et les balises Open Graph
 * (souvent le poste et l'entreprise) sont mis en tête, suivis du texte du corps.
 */
export function htmlToPlainText(html: string, maxChars = 8000): string {
  const title = extractTagContent(html, "title");
  const ogTitle = extractMetaContent(html, "og:title");
  const ogSiteName = extractMetaContent(html, "og:site_name");
  const ogDescription = extractMetaContent(html, "og:description");

  const header = [
    title && `Title: ${title}`,
    ogTitle && `OG title: ${ogTitle}`,
    ogSiteName && `OG site name: ${ogSiteName}`,
    ogDescription && `OG description: ${ogDescription}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const bodyText = decodeEntities(stripTags(html)).replace(/\s+/g, " ").trim();

  const combined = header ? `${header}\n\n${bodyText}` : bodyText;
  return combined.slice(0, maxChars);
}
