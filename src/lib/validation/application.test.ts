import { describe, expect, it } from "vitest";

import { CreateApplicationSchema } from "./application";

describe("CreateApplicationSchema iconUrl", () => {
  it("accepts a well-formed uploaded icon path", () => {
    const result = CreateApplicationSchema.safeParse({
      company: "Acme",
      role: "SWE",
      iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null (icon removed) and omitted (untouched)", () => {
    expect(
      CreateApplicationSchema.safeParse({
        company: "A",
        role: "R",
        iconUrl: null,
      }).success,
    ).toBe(true);
    expect(
      CreateApplicationSchema.safeParse({ company: "A", role: "R" }).success,
    ).toBe(true);
  });

  it("rejects an external URL", () => {
    const result = CreateApplicationSchema.safeParse({
      company: "Acme",
      role: "SWE",
      iconUrl: "https://evil.example.com/logo.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a path-traversal attempt", () => {
    const result = CreateApplicationSchema.safeParse({
      company: "Acme",
      role: "SWE",
      iconUrl: "/uploads/icons/../../etc/passwd.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported extension", () => {
    const result = CreateApplicationSchema.safeParse({
      company: "Acme",
      role: "SWE",
      iconUrl: "/uploads/icons/11111111-1111-1111-1111-111111111111.exe",
    });
    expect(result.success).toBe(false);
  });
});
