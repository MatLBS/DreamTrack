import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
});

export const SignupSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis"),
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
