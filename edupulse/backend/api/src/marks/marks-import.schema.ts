import { z } from 'zod';
import { marksGridSchema } from './marks.schema';

export const MARKS_IMPORT_HEADER = ['USN', 'Student Name', 'Q1', 'Q2', 'Q3'] as const;

export const marksImportBodySchema = z
  .object({
    base64: z.string().min(1).optional(),
    fileName: z.string().min(1).optional(),
    csv: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.base64 || value.csv), {
    message: 'Provide base64 Excel payload or csv text',
  });

export const marksImportErrorSchema = z.object({
  row: z.number().int().positive(),
  usn: z.string().optional(),
  column: z.string().optional(),
  message: z.string(),
  code: z.enum(['PARSE', 'VALIDATION', 'USN_MISMATCH']).optional(),
});

export const marksUsnMismatchSchema = z.object({
  row: z.number().int().positive(),
  usn: z.string(),
  message: z.string(),
});

export const marksImportSummarySchema = z.object({
  rowsProcessed: z.number().int().nonnegative(),
  rowsImported: z.number().int().nonnegative(),
  cellsImported: z.number().int().nonnegative(),
  errors: z.array(marksImportErrorSchema),
  usnMismatches: z.array(marksUsnMismatchSchema),
  grid: marksGridSchema,
});

export const marksImportTemplateSchema = z.object({
  fileName: z.string(),
  base64: z.string(),
  header: z.array(z.string()),
  csv: z.string(),
});

export type MarksImportBody = z.infer<typeof marksImportBodySchema>;
export type MarksImportSummary = z.infer<typeof marksImportSummarySchema>;
export type MarksImportTemplate = z.infer<typeof marksImportTemplateSchema>;
