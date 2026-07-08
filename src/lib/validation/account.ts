import { z } from "zod";

export const UpdateAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
