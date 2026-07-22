import { describe, expect, it } from "vitest";

import { UpdateProfileSchema, WORKPLACE_PREFERENCES } from "./profile";

describe("UpdateProfileSchema workplacePreference", () => {
  it("accepts one or several allowed values", () => {
    expect(
      UpdateProfileSchema.safeParse({ workplacePreference: ["Remote"] })
        .success,
    ).toBe(true);
    expect(
      UpdateProfileSchema.safeParse({
        workplacePreference: ["Remote", "Hybrid"],
      }).success,
    ).toBe(true);
    expect(
      UpdateProfileSchema.safeParse({ workplacePreference: [...WORKPLACE_PREFERENCES] })
        .success,
    ).toBe(true);
  });

  it("rejects any value outside Remote/Hybrid/Onsite", () => {
    expect(
      UpdateProfileSchema.safeParse({ workplacePreference: ["Freelance"] })
        .success,
    ).toBe(false);
    expect(
      UpdateProfileSchema.safeParse({
        workplacePreference: ["Onsite", "Freelance"],
      }).success,
    ).toBe(false);
    expect(
      UpdateProfileSchema.safeParse({ workplacePreference: ["remote"] })
        .success,
    ).toBe(false);
  });
});

describe("UpdateProfileSchema yearsOfExperience", () => {
  it("accepts null and a non-negative integer", () => {
    expect(
      UpdateProfileSchema.safeParse({ yearsOfExperience: null }).success,
    ).toBe(true);
    expect(
      UpdateProfileSchema.safeParse({ yearsOfExperience: 5 }).success,
    ).toBe(true);
    expect(
      UpdateProfileSchema.safeParse({ yearsOfExperience: 0 }).success,
    ).toBe(true);
  });

  it("rejects a negative or non-integer value", () => {
    expect(
      UpdateProfileSchema.safeParse({ yearsOfExperience: -1 }).success,
    ).toBe(false);
    expect(
      UpdateProfileSchema.safeParse({ yearsOfExperience: 2.5 }).success,
    ).toBe(false);
  });
});

describe("UpdateProfileSchema skills / industries", () => {
  it("accepts an array of non-empty strings", () => {
    expect(
      UpdateProfileSchema.safeParse({ skills: ["Python", "TypeScript"] })
        .success,
    ).toBe(true);
    expect(
      UpdateProfileSchema.safeParse({ industries: ["Fintech"] }).success,
    ).toBe(true);
  });

  it("rejects an empty string in the array", () => {
    expect(
      UpdateProfileSchema.safeParse({ skills: ["Python", ""] }).success,
    ).toBe(false);
  });
});
