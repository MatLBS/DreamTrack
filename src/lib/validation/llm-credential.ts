import { z } from "zod";

export const LLM_PROVIDERS = ["anthropic", "openai", "openrouter"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

const KEY_PREFIX_BY_PROVIDER: Record<LlmProvider, string> = {
  anthropic: "sk-ant-",
  openai: "sk-",
  openrouter: "sk-or-",
};

export const SaveLlmCredentialSchema = z
  .object({
    provider: z.enum(LLM_PROVIDERS),
    apiKey: z.string().trim().min(20, "API key looks too short"),
    modelExtraction: z.string().optional(),
    modelScoring: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const prefix = KEY_PREFIX_BY_PROVIDER[value.provider];
    if (!value.apiKey.startsWith(prefix)) {
      ctx.addIssue({
        code: "custom",
        message: `Expected a key starting with "${prefix}" for ${value.provider}`,
        path: ["apiKey"],
      });
    }
  });

export type SaveLlmCredentialInput = z.infer<typeof SaveLlmCredentialSchema>;
