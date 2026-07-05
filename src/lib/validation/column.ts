import { z } from "zod";

export const CreateColumnSchema = z.object({
  name: z.string().trim().min(1),
  index: z.number().int().min(1),
});

export const RenameColumnSchema = z.object({
  name: z.string().trim().min(1),
});

export const ReorderColumnSchema = z.object({
  index: z.number().int().min(1),
});

export type CreateColumnInput = z.infer<typeof CreateColumnSchema>;
export type RenameColumnInput = z.infer<typeof RenameColumnSchema>;
export type ReorderColumnInput = z.infer<typeof ReorderColumnSchema>;
