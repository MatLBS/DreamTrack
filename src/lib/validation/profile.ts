import { z } from "zod";

export const UpdateProfileSchema = z
  .object({
    desiredPositions: z.array(z.string().trim().min(1)).max(10).optional(),
    locations: z.array(z.string().trim().min(1)).max(10).optional(),
    salaryMin: z.number().int().min(0).nullable().optional(),
    salaryMax: z.number().int().min(0).nullable().optional(),
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
