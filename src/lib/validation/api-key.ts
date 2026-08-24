import { z } from "zod";

export const CreateApiKeySchema = z.object({
  name: z.string().trim().min(1).max(60),
  /** Durée de vie en jours ; absent ou null = pas d'expiration. */
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

export const RevokeApiKeySchema = z.object({
  id: z.string().min(1),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof RevokeApiKeySchema>;
