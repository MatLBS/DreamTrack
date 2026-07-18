const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 Mo
const MAX_REDIRECTS = 5;

export class PageFetchError extends Error {
  constructor(
    message: string,
    public readonly reason: "fetch_failed" | "blocked",
  ) {
    super(message);
    this.name = "PageFetchError";
  }
}

/**
 * Rejette les URL pointant vers des hôtes privés/loopback. Le `fetch` s'exécute
 * côté serveur sur une URL saisie par l'utilisateur : sans ce garde, on expose
 * une SSRF vers le réseau interne (localhost, métadonnées cloud, LAN).
 */
function assertPublicHttpUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PageFetchError(
      `Unsupported protocol: ${url.protocol}`,
      "blocked",
    );
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    throw new PageFetchError(`Blocked host: ${hostname}`, "blocked");
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    const isPrivate =
      a === 127 ||
      a === 10 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (isPrivate) {
      throw new PageFetchError(`Blocked private IP: ${hostname}`, "blocked");
    }
  }
}

async function readBodyWithCap(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new PageFetchError("Response body exceeds size limit", "blocked");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

/**
 * Récupère le HTML d'une page publique, en suivant les redirections manuellement
 * (chaque hop est revalidé contre le garde SSRF) et en imposant un timeout et un
 * plafond de taille. Un corps vide (throttling anti-bot observé sur certains ATS)
 * est traité comme un blocage explicite, pas comme une page vide légitime.
 */
export async function fetchPageHtml(rawUrl: string): Promise<string> {
  let currentUrl: URL;
  try {
    currentUrl = new URL(rawUrl);
  } catch {
    throw new PageFetchError(`Invalid URL: ${rawUrl}`, "fetch_failed");
  }

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    assertPublicHttpUrl(currentUrl);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } catch (error) {
      throw new PageFetchError(
        `Failed to fetch ${currentUrl.toString()}: ${(error as Error).message}`,
        "fetch_failed",
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new PageFetchError(
          `Redirect without Location header from ${currentUrl.toString()}`,
          "fetch_failed",
        );
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (response.status >= 400) {
      throw new PageFetchError(
        `${currentUrl.toString()} returned HTTP ${response.status}`,
        "fetch_failed",
      );
    }

    const html = await readBodyWithCap(response);
    if (html.trim().length === 0) {
      throw new PageFetchError(
        `${currentUrl.toString()} returned an empty body`,
        "blocked",
      );
    }
    return html;
  }

  throw new PageFetchError("Too many redirects", "fetch_failed");
}
