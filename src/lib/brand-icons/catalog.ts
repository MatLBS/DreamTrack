import {
  siAccenture,
  siAirbnb,
  siAirfrance,
  siAlgolia,
  siAnthropic,
  siApple,
  siAtlassian,
  siAudi,
  siBinance,
  siBmw,
  siBookingdotcom,
  siBosch,
  siCarrefour,
  siCoinbase,
  siDassaultsystemes,
  siDatabricks,
  siDatadog,
  siDeezer,
  siDiscord,
  siDropbox,
  siFacebook,
  siFigma,
  siGithub,
  siGitlab,
  siGoogle,
  siHellofresh,
  siIntel,
  siMastercard,
  siMeta,
  siMistralai,
  siN26,
  siNetflix,
  siNotion,
  siNvidia,
  siOrange,
  siOvh,
  siPalantir,
  siPaypal,
  siPinterest,
  siRenault,
  siReddit,
  siRevolut,
  siSamsung,
  siSap,
  siSiemens,
  siSnapchat,
  siSncf,
  siSnowflake,
  siSony,
  siSpotify,
  siStripe,
  siShopify,
  siTesla,
  siTiktok,
  siTwitch,
  siUber,
  siUbisoft,
  siVisa,
  siVolkswagen,
  siX,
  siZoom,
} from "simple-icons";

/**
 * Icône de marque telle qu'on la consomme dans l'app (sous-ensemble de ce que
 * simple-icons expose : on n'a besoin que du tracé, de la couleur et du titre).
 */
export interface BrandIcon {
  title: string;
  slug: string;
  /** Couleur officielle de la marque, sans le `#`. */
  hex: string;
  /** Tracé SVG unique, dans un viewBox `0 0 24 24`. */
  path: string;
}

interface CatalogEntry {
  icon: BrandIcon;
  /**
   * Noms alternatifs sous lesquels l'entreprise peut être saisie. Ils sont
   * normalisés au même titre que la saisie utilisateur, donc la casse, les
   * accents et les espaces n'ont pas d'importance ici.
   */
  aliases?: string[];
}

/**
 * Banque d'icônes : les entreprises connues pour lesquelles on affiche un vrai
 * logo sur la carte. Les imports sont **nommés** volontairement — un accès
 * dynamique (`icons[slug]`) empêcherait le tree-shaking et embarquerait les
 * ~3400 icônes de simple-icons dans le bundle client.
 *
 * Ajouter une entreprise = ajouter un import + une entrée ici.
 *
 * Note : simple-icons ne distribue plus certaines marques majeures (Amazon,
 * Microsoft, LinkedIn, Adobe, Oracle, Salesforce…) pour des raisons de licence
 * de marque. Ces entreprises retombent sur l'avatar à initiales.
 */
const CATALOG: CatalogEntry[] = [
  { icon: siGoogle, aliases: ["google france", "alphabet"] },
  { icon: siMeta, aliases: ["meta platforms"] },
  { icon: siFacebook },
  { icon: siApple },
  { icon: siNetflix },
  { icon: siSpotify },
  { icon: siTwitch },
  { icon: siAirbnb },
  { icon: siUber, aliases: ["uber eats"] },
  { icon: siStripe },
  { icon: siShopify },
  { icon: siNvidia },
  { icon: siIntel },
  { icon: siSap },
  { icon: siTesla },
  { icon: siSnowflake },
  { icon: siDatadog },
  { icon: siFigma },
  { icon: siNotion },
  { icon: siDiscord },
  { icon: siGithub },
  { icon: siGitlab },
  { icon: siAtlassian, aliases: ["jira", "confluence"] },
  { icon: siDropbox },
  { icon: siZoom },
  { icon: siDeezer },
  { icon: siDassaultsystemes, aliases: ["dassault", "dassault systemes"] },
  { icon: siUbisoft },
  { icon: siOrange, aliases: ["orange business"] },
  { icon: siRenault, aliases: ["groupe renault"] },
  { icon: siAirfrance, aliases: ["air france", "air france klm"] },
  { icon: siCarrefour },
  { icon: siAccenture },
  { icon: siSncf, aliases: ["sncf connect", "sncf reseau"] },
  { icon: siOvh, aliases: ["ovhcloud", "ovh cloud"] },
  { icon: siAlgolia },
  { icon: siMistralai, aliases: ["mistral", "mistral ai"] },
  { icon: siAnthropic },
  { icon: siDatabricks },
  { icon: siPalantir, aliases: ["palantir technologies"] },
  { icon: siRevolut },
  { icon: siN26 },
  { icon: siHellofresh, aliases: ["hello fresh"] },
  { icon: siPinterest },
  { icon: siSnapchat, aliases: ["snap", "snap inc"] },
  { icon: siTiktok, aliases: ["bytedance"] },
  { icon: siReddit },
  { icon: siCoinbase },
  { icon: siBinance },
  { icon: siPaypal },
  { icon: siVisa },
  { icon: siMastercard },
  { icon: siSamsung },
  { icon: siSony },
  { icon: siBosch },
  { icon: siSiemens },
  { icon: siVolkswagen },
  { icon: siBmw },
  { icon: siAudi },
  { icon: siBookingdotcom, aliases: ["booking", "booking com"] },
  { icon: siX, aliases: ["twitter"] },
];

/**
 * Formes juridiques et suffixes d'entreprise retirés avant l'indexation, pour
 * que `"Stripe Inc."` et `"Stripe"` tombent sur la même clé. Retirés en tant que
 * *mots entiers* uniquement : `"Coinbase"` ou `"Cisco"` ne sont pas amputés.
 */
const LEGAL_FORM_TOKENS = new Set([
  "sa",
  "sas",
  "sasu",
  "sarl",
  "eurl",
  "sci",
  "inc",
  "llc",
  "ltd",
  "limited",
  "plc",
  "corp",
  "corporation",
  "co",
  "company",
  "gmbh",
  "ag",
  "bv",
  "nv",
  "spa",
  "srl",
  "oy",
  "ab",
  "as",
  "group",
  "groupe",
  "holding",
  "holdings",
  "technologies",
  "technology",
]);

/**
 * Réduit un nom d'entreprise à une clé comparable : minuscules, sans accents,
 * sans forme juridique (SAS, Inc., GmbH…) et sans ponctuation ni espaces.
 * `"Air France K.L.M. S.A."` → `"airfranceklm"`.
 */
export function normalizeCompanyKey(value: string): string {
  const withoutAccents = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Recolle les acronymes pointés avant le découpage, sinon « S.A.S » se
  // décompose en trois tokens d'une lettre qu'on ne reconnaît plus.
  const withCollapsedAcronyms = withoutAccents.replace(
    /\b(?:[a-z]\.){2,}[a-z]?/g,
    (acronym) => acronym.replace(/\./g, "") + " ",
  );

  const withoutLegalForms = withCollapsedAcronyms
    .split(/[\s.,'’&/-]+/)
    .filter((token) => token !== "" && !LEGAL_FORM_TOKENS.has(token))
    .join("");

  return withoutLegalForms.replace(/[^a-z0-9]/g, "");
}

/**
 * Index `nom normalisé → icône`, construit une fois au chargement du module.
 * Chaque icône est indexée sous son titre, son slug et chacun de ses alias.
 */
export const BRAND_ICON_INDEX: ReadonlyMap<string, BrandIcon> = new Map(
  CATALOG.flatMap(({ icon, aliases = [] }) =>
    [icon.title, icon.slug, ...aliases].map(
      (key) => [normalizeCompanyKey(key), icon] as const,
    ),
  ),
);
