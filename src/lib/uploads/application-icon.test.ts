import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ServiceError } from "@/services/errors";

import { deleteApplicationIcon, saveApplicationIcon } from "./application-icon";

const ICON_DIR = path.join(process.cwd(), "public", "uploads", "icons");

async function serviceErrorCode(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof ServiceError) return error.code;
    throw error;
  }
  throw new Error("expected fn() to throw");
}

const writtenUrls: string[] = [];

async function save(file: File): Promise<string> {
  const url = await saveApplicationIcon(file);
  writtenUrls.push(url);
  return url;
}

afterEach(async () => {
  await Promise.all(
    writtenUrls
      .splice(0)
      .map((url) =>
        rm(path.join(ICON_DIR, path.basename(url)), { force: true }),
      ),
  );
});

describe("saveApplicationIcon", () => {
  it("writes a PNG and returns a matching public URL", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "logo.png", {
      type: "image/png",
    });
    const url = await save(file);

    expect(url).toMatch(/^\/uploads\/icons\/[0-9a-f-]+\.png$/);
    expect(existsSync(path.join(ICON_DIR, path.basename(url)))).toBe(true);
  });

  it("strips <script> and event handlers from an uploaded SVG", async () => {
    const malicious =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
      "<script>alert(1)</script>" +
      '<circle cx="12" cy="12" r="10" /></svg>';
    const file = new File([malicious], "logo.svg", { type: "image/svg+xml" });
    const url = await save(file);

    const written = await readFile(
      path.join(ICON_DIR, path.basename(url)),
      "utf-8",
    );
    expect(written).not.toContain("<script");
    expect(written).not.toContain("onload");
    expect(written).toContain("<svg");
    expect(written).toContain("circle");
  });

  it("rejects an unsupported MIME type", async () => {
    const file = new File([new Uint8Array([1])], "logo.gif", {
      type: "image/gif",
    });
    const code = await serviceErrorCode(() => saveApplicationIcon(file));
    expect(code).toBe("UNSUPPORTED_IMAGE_TYPE");
  });

  it("rejects a file larger than 1MB", async () => {
    const oversized = new Uint8Array(1024 * 1024 + 1);
    const file = new File([oversized], "logo.png", { type: "image/png" });
    const code = await serviceErrorCode(() => saveApplicationIcon(file));
    expect(code).toBe("IMAGE_TOO_LARGE");
  });
});

describe("deleteApplicationIcon", () => {
  it("removes a previously saved icon file", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "logo.png", {
      type: "image/png",
    });
    const url = await saveApplicationIcon(file);
    const filePath = path.join(ICON_DIR, path.basename(url));
    expect(existsSync(filePath)).toBe(true);

    await deleteApplicationIcon(url);
    expect(existsSync(filePath)).toBe(false);
  });

  it("does nothing for null, undefined, or an already-missing file", async () => {
    await expect(deleteApplicationIcon(null)).resolves.toBeUndefined();
    await expect(deleteApplicationIcon(undefined)).resolves.toBeUndefined();
    await expect(
      deleteApplicationIcon("/uploads/icons/does-not-exist.png"),
    ).resolves.toBeUndefined();
  });

  it("ignores a URL outside the icons directory", async () => {
    await expect(
      deleteApplicationIcon("/uploads/avatars/someone-elses-avatar.png"),
    ).resolves.toBeUndefined();
  });
});
