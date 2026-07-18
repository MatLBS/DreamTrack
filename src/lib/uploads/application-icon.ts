import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import { ServiceError } from "@/services/errors";

const ALLOWED_ICON_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
};
const MAX_ICON_BYTES = 1024 * 1024;
const ICON_DIR = path.join(process.cwd(), "public", "uploads", "icons");
const ICON_URL_PATTERN = /^\/uploads\/icons\/[0-9a-f-]+\.(png|svg)$/;

/**
 * Nettoie un SVG uploadé avant écriture disque : retire `<script>`, les
 * gestionnaires `on*`, `foreignObject` et toute référence externe. Le fichier
 * stocké est donc inoffensif même ouvert directement depuis `/public`, qui le
 * sert sans aucune isolation (pas de CSP dédiée, même origine que l'app).
 */
function sanitizeSvg(raw: string): string {
  const { window } = new JSDOM("");
  const DOMPurify = createDOMPurify(window);
  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  if (!clean.includes("<svg")) {
    throw new ServiceError("UNSUPPORTED_IMAGE_TYPE", "Unsupported image type");
  }
  return clean;
}

/**
 * Enregistre l'icône uploadée pour une candidature. Suit le même pattern que
 * `saveAvatar` (src/app/actions/account.ts) : extension déduite du MIME type
 * (jamais du nom de fichier client), nom aléatoire, écriture dans
 * `public/uploads/`. Retourne l'URL publique à persister en base.
 */
export async function saveApplicationIcon(file: File): Promise<string> {
  const extension = ALLOWED_ICON_TYPES[file.type];
  if (!extension) {
    throw new ServiceError("UNSUPPORTED_IMAGE_TYPE", "Unsupported image type");
  }
  if (file.size > MAX_ICON_BYTES) {
    throw new ServiceError("IMAGE_TOO_LARGE", "Image is too large (max 1MB)");
  }

  await mkdir(ICON_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;

  if (extension === "svg") {
    const raw = await file.text();
    await writeFile(path.join(ICON_DIR, filename), sanitizeSvg(raw), "utf-8");
  } else {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(ICON_DIR, filename), buffer);
  }

  return `/uploads/icons/${filename}`;
}

/**
 * Supprime le fichier d'une icône précédemment sauvegardée. N'accepte que des
 * URLs conformes au motif attendu (jamais un chemin arbitraire fourni par
 * l'appelant) et ignore silencieusement un fichier déjà absent.
 */
export async function deleteApplicationIcon(
  url: string | null | undefined,
): Promise<void> {
  if (!url || !ICON_URL_PATTERN.test(url)) return;

  const filename = path.basename(url);
  try {
    await unlink(path.join(ICON_DIR, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
