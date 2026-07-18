import { buildExportableSvgMarkup, sankeyExportFilename } from "./export-svg";

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Rasterise le SVG du Sankey en PNG (via un `<canvas>`, à 2x pour rester net) et
 * déclenche son téléchargement. Les couleurs sont lues depuis les variables CSS
 * de la page au moment du clic pour matcher le thème clair/sombre courant.
 */
export async function downloadSankeyAsPng(svg: SVGSVGElement): Promise<void> {
  const width = svg.clientWidth || svg.viewBox.baseVal.width;
  const height = svg.clientHeight || svg.viewBox.baseVal.height;

  const markup = buildExportableSvgMarkup(svg.outerHTML, width, height, {
    positive: readCssVar("--sankey-positive"),
    negative: readCssVar("--sankey-negative"),
    foreground: readCssVar("--foreground"),
    background: readCssVar("--card"),
  });

  const svgUrl = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
  );

  const scale = 2;
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load SVG for export"));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!pngBlob) throw new Error("Failed to encode PNG");

    triggerDownload(pngBlob, sankeyExportFilename(new Date(), "png"));
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
