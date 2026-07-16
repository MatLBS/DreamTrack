import { describe, expect, it } from "vitest";

import { fr } from "./fr";
import { en } from "./en";

function collectKeyShape(value: unknown, prefix = ""): Record<string, string> {
  const shape: Record<string, string> = {};

  if (typeof value === "function") {
    shape[prefix] = "function";
    return shape;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      Object.assign(
        shape,
        collectKeyShape(nested, prefix ? `${prefix}.${key}` : key),
      );
    }
    return shape;
  }

  shape[prefix] = typeof value;
  return shape;
}

describe("i18n dictionary", () => {
  it("has the exact same keys and leaf kinds in fr and en", () => {
    const frShape = collectKeyShape(fr);
    const enShape = collectKeyShape(en);

    expect(Object.keys(enShape).sort()).toEqual(Object.keys(frShape).sort());
    for (const key of Object.keys(frShape)) {
      expect(enShape[key], `mismatched kind for key "${key}"`).toBe(
        frShape[key],
      );
    }
  });

  describe("applicationsCount pluralization", () => {
    it("french: singular for 0 and 1, plural otherwise", () => {
      expect(fr.kanban.applicationsCount(0)).toBe("0 candidature");
      expect(fr.kanban.applicationsCount(1)).toBe("1 candidature");
      expect(fr.kanban.applicationsCount(2)).toBe("2 candidatures");
    });

    it("english: plural for 0, singular for 1, plural otherwise", () => {
      expect(en.kanban.applicationsCount(0)).toBe("0 applications");
      expect(en.kanban.applicationsCount(1)).toBe("1 application");
      expect(en.kanban.applicationsCount(2)).toBe("2 applications");
    });
  });
});
