import { z } from "zod";

export const CreateColumnSchema = z.object({
  name: z.string().trim().min(1),
  index: z.number().int().min(1),
  isLostStage: z.boolean().default(false),
});

export const RenameColumnSchema = z.object({
  name: z.string().trim().min(1),
});

export const ReorderColumnSchema = z.object({
  index: z.number().int().min(1),
});

export const SetColumnCategorySchema = z.object({
  isLostStage: z.boolean(),
});

export type CreateColumnInput = z.input<typeof CreateColumnSchema>;
export type RenameColumnInput = z.infer<typeof RenameColumnSchema>;
export type ReorderColumnInput = z.infer<typeof ReorderColumnSchema>;
export type SetColumnCategoryInput = z.infer<typeof SetColumnCategorySchema>;
