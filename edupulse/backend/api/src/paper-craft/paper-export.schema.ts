import { z } from 'zod';

export const exportPaperPdfQuerySchema = z.object({
  includeAnswerKey: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value !== 'false'),
});

export const paperPdfExportSchema = z.object({
  paperId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.literal('application/pdf'),
  base64: z.string(),
  exportedAt: z.string().datetime(),
  exportedBy: z.string(),
  exportedByName: z.string(),
  institutionId: z.string().uuid(),
  institutionName: z.string(),
  courseCode: z.string(),
  examType: z.string(),
  totalMarks: z.number().int().positive(),
  questionCount: z.number().int().positive(),
  includesAnswerKey: z.boolean(),
  moderationStatus: z.literal('approved'),
  byteLength: z.number().int().positive(),
});

export type PaperPdfExport = z.infer<typeof paperPdfExportSchema>;
