import { z } from "zod";

export const CreateApplicationSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  url: z.url().nullable().optional(),
  notes: z.string().nullable().optional(),
  iconUrl: z
    .string()
    .regex(/^\/uploads\/icons\/[0-9a-f-]+\.(png|svg)$/)
    .nullable()
    .optional(),
  columnId: z.string().min(1).optional(),
});

export const UpdateApplicationSchema = CreateApplicationSchema.omit({
  columnId: true,
}).partial();

export const MoveApplicationSchema = z.object({
  toColumnId: z.string().min(1),
  toIndex: z.number().int().min(0),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
export type MoveApplicationInput = z.infer<typeof MoveApplicationSchema>;
