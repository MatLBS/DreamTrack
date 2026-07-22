import { z } from "zod";

export const WORKPLACE_PREFERENCES = ["Remote", "Hybrid", "Onsite"] as const;

export const UpdateProfileSchema = z
  .object({
    desiredPositions: z.array(z.string().trim().min(1)).max(10).optional(),
    locations: z.array(z.string().trim().min(1)).max(10).optional(),
    salaryMin: z.number().int().min(0).nullable().optional(),
    salaryMax: z.number().int().min(0).nullable().optional(),
    skills: z.array(z.string().trim().min(1)).max(20).optional(),
    industries: z.array(z.string().trim().min(1)).max(10).optional(),
    workplacePreference: z
      .array(z.enum(WORKPLACE_PREFERENCES))
      .max(WORKPLACE_PREFERENCES.length)
      .optional(),
    yearsOfExperience: z.number().int().min(0).max(60).nullable().optional(),
  })
  .refine(
    (value) =>
      value.salaryMin == null ||
      value.salaryMax == null ||
      value.salaryMin <= value.salaryMax,
    {
      message: "salaryMin must be less than or equal to salaryMax",
      path: ["salaryMin"],
    },
  );

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
