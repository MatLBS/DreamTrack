import { z } from "zod";

export const LETTER_TONES = ["formal", "conversational"] as const;
export type LetterTone = (typeof LETTER_TONES)[number];

export const GenerateCoverLetterSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  role: z.string().trim().min(1, "Role is required"),
  description: z.string().nullable().optional(),
  tone: z.enum(LETTER_TONES),
});

export type GenerateCoverLetterInput = z.infer<
  typeof GenerateCoverLetterSchema
>;

export const SaveCoverLetterSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  role: z.string().trim().min(1, "Role is required"),
  paragraphs: z.array(z.string()).min(1, "At least one paragraph is required"),
  tone: z.enum(LETTER_TONES),
});

export type SaveCoverLetterInput = z.infer<typeof SaveCoverLetterSchema>;
