import { describe, expect, it } from "vitest";

import { BRAND_ICON_INDEX } from "./catalog";
import { findBrandIcon, normalizeCompanyKey } from "./index";

describe("normalizeCompanyKey", () => {
  it("met en minuscules et retire les espaces", () => {
    expect(normalizeCompanyKey("Air France")).toBe("airfrance");
  });

  it("retire les accents", () => {
    expect(normalizeCompanyKey("Société")).toBe("societe");
  });

  it("retire les formes juridiques en fin de nom", () => {
    expect(normalizeCompanyKey("Stripe Inc.")).toBe("stripe");
    expect(normalizeCompanyKey("Renault S.A.S")).toBe("renault");
    expect(normalizeCompanyKey("Bosch GmbH")).toBe("bosch");
  });

  it("ne tronque pas un mot qui contient une forme juridique", () => {
    expect(normalizeCompanyKey("Coinbase")).toBe("coinbase");
    expect(normalizeCompanyKey("Cisco")).toBe("cisco");
    expect(normalizeCompanyKey("Corsair")).toBe("corsair");
  });

  it("retire la ponctuation", () => {
    expect(normalizeCompanyKey("Booking.com")).toBe("bookingcom");
    expect(normalizeCompanyKey("L'Oréal")).toBe("loreal");
  });

  it("renvoie une chaîne vide pour une saisie sans lettre", () => {
    expect(normalizeCompanyKey("   ")).toBe("");
    expect(normalizeCompanyKey("!!!")).toBe("");
  });
});

describe("findBrandIcon", () => {
  it("trouve une entreprise par son nom exact", () => {
    expect(findBrandIcon("Google")?.slug).toBe("google");
    expect(findBrandIcon("Twitch")?.slug).toBe("twitch");
  });

  it("ignore la casse et les espaces superflus", () => {
    expect(findBrandIcon("  gOOgLe ")?.slug).toBe("google");
  });

  it("ignore la forme juridique", () => {
    expect(findBrandIcon("Stripe, Inc.")?.slug).toBe("stripe");
  });

  it("résout les alias", () => {
    expect(findBrandIcon("Twitter")?.slug).toBe("x");
    expect(findBrandIcon("Mistral AI")?.slug).toBe("mistralai");
    expect(findBrandIcon("Air France")?.slug).toBe("airfrance");
  });

  it("renvoie null pour une entreprise inconnue", () => {
    expect(findBrandIcon("Boulangerie Dupont")).toBeNull();
  });

  it("renvoie null pour une saisie vide", () => {
    expect(findBrandIcon("")).toBeNull();
    expect(findBrandIcon("   ")).toBeNull();
  });

  it("ne fait pas de correspondance approximative", () => {
    expect(findBrandIcon("Apple Tree Studio")).toBeNull();
    expect(findBrandIcon("Googly")).toBeNull();
  });

  it("expose une icône exploitable (tracé + couleur)", () => {
    const icon = findBrandIcon("Google");
    expect(icon?.path).toMatch(/^[Mm]/);
    expect(icon?.hex).toMatch(/^[0-9A-F]{6}$/i);
  });
});

describe("catalogue", () => {
  it("n'indexe pas deux entreprises différentes sous la même clé", () => {
    // Une collision signifierait qu'un alias en écrase un autre silencieusement.
    const bySlug = new Map<string, Set<string>>();
    for (const [key, icon] of BRAND_ICON_INDEX) {
      const keys = bySlug.get(icon.slug) ?? new Set();
      keys.add(key);
      bySlug.set(icon.slug, keys);
    }
    const totalKeys = [...bySlug.values()].reduce(
      (sum, keys) => sum + keys.size,
      0,
    );
    expect(totalKeys).toBe(BRAND_ICON_INDEX.size);
  });

  it("contient au moins les entreprises populaires attendues", () => {
    for (const company of [
      "Google",
      "Twitch",
      "Netflix",
      "Spotify",
      "Airbnb",
      "Stripe",
      "Figma",
      "Notion",
      "Tesla",
      "Uber",
    ]) {
      expect(findBrandIcon(company), `${company} manquant`).not.toBeNull();
    }
  });
});
