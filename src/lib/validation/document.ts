import { z } from "zod";

export const DOCUMENT_KINDS = ["cv", "cover_letter", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const UploadDocumentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string().trim().min(1, "Title is required"),
});

export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;
