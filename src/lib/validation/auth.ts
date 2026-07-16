import { z } from "zod";

interface AuthValidationMessages {
  invalidEmail: string;
  passwordMin: string;
  nameRequired: string;
}

export function createLoginSchema(messages: AuthValidationMessages) {
  return z.object({
    email: z.email(messages.invalidEmail),
    password: z.string().min(8, messages.passwordMin),
  });
}

export function createSignupSchema(messages: AuthValidationMessages) {
  return z.object({
    name: z.string().trim().min(1, messages.nameRequired),
    email: z.email(messages.invalidEmail),
    password: z.string().min(8, messages.passwordMin),
  });
}

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type SignupInput = z.infer<ReturnType<typeof createSignupSchema>>;
