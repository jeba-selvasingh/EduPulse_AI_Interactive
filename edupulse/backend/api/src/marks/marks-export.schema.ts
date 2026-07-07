import { z } from 'zod';

export const erpExportColumnSchema = z.object({
  key: z.string().min(1),
  header: z.string().min(1),
});

export const erpExportTemplateSchema = z.object({
  templateId: z.string().min(1),
  institutionSlug: z.string().min(1),
  columns: z.array(erpExportColumnSchema).min(4),
});

export const updateErpExportTemplateSchema = z.object({
  templateId: z.string().min(1).optional(),
  columns: z.array(erpExportColumnSchema).min(4),
});

export const marksCsvExportSchema = z.object({
  fileName: z.string(),
  csv: z.string(),
  contentType: z.literal('text/csv'),
  rowCount: z.number().int().nonnegative(),
  exportedAt: z.string().datetime(),
  templateId: z.string(),
  assessmentId: z.string(),
  courseCode: z.string(),
  examType: z.string(),
  institutionCode: z.string(),
});

export type ErpExportColumn = z.infer<typeof erpExportColumnSchema>;
export type ErpExportTemplate = z.infer<typeof erpExportTemplateSchema>;
export type MarksCsvExport = z.infer<typeof marksCsvExportSchema>;
