import { describe, expect, it } from "vitest";

import { buildExportableSvgMarkup, sankeyExportFilename } from "./export-svg";

describe("sankeyExportFilename", () => {
  it("formats the date as yyyy-MM-dd with the given extension", () => {
    expect(sankeyExportFilename(new Date(2026, 6, 18), "png")).toBe(
      "sankey-2026-07-18.png",
    );
  });
});

describe("buildExportableSvgMarkup", () => {
  const colors = {
    positive: "#16b364",
    negative: "#e11d63",
    foreground: "#111111",
    background: "#ffffff",
  };

  it("replaces the sankey CSS variables with resolved colors", () => {
    const svg =
      '<svg width="100" height="50"><rect fill="var(--sankey-positive)" /><rect fill="var(--sankey-negative)" /></svg>';

    const result = buildExportableSvgMarkup(svg, 100, 50, colors);

    expect(result).not.toContain("var(--sankey-positive)");
    expect(result).not.toContain("var(--sankey-negative)");
    expect(result).toContain('fill="#16b364"');
    expect(result).toContain('fill="#e11d63"');
  });

  it("adds an xmlns attribute when missing", () => {
    const svg = '<svg width="100" height="50"></svg>';

    const result = buildExportableSvgMarkup(svg, 100, 50, colors);

    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("does not duplicate xmlns when already present", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"></svg>';

    const result = buildExportableSvgMarkup(svg, 100, 50, colors);

    expect(result.match(/xmlns=/g)).toHaveLength(1);
  });

  it("injects a background rect and a text style before the original content", () => {
    const svg = '<svg width="100" height="50"><text>Repérée</text></svg>';

    const result = buildExportableSvgMarkup(svg, 100, 50, colors);

    expect(result).toContain(
      '<rect x="0" y="0" width="100" height="50" fill="#ffffff" />',
    );
    expect(result).toContain(`fill:${colors.foreground}`);
    const backgroundIndex = result.indexOf("<rect");
    const textIndex = result.indexOf("<text>");
    expect(backgroundIndex).toBeLessThan(textIndex);
  });

  it("prefixes the markup with an XML declaration", () => {
    const svg = '<svg width="100" height="50"></svg>';

    const result = buildExportableSvgMarkup(svg, 100, 50, colors);

    expect(result.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
      true,
    );
  });
});
