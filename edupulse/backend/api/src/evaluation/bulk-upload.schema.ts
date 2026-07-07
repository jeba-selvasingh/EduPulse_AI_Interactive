import { z } from 'zod';

export const MAX_BULK_UPLOAD_BYTES = 200 * 1024 * 1024;

export const bulkUploadEntrySchema = z.object({
  fileName: z.string().min(1),
  base64: z.string().optional(),
  estimatedDpi: z.number().positive().optional(),
});

export const bulkUploadBodySchema = z.object({
  fileName: z.string().min(1),
  base64: z.string().optional(),
  byteLength: z.number().int().nonnegative().optional(),
  estimatedDpi: z.number().positive().optional(),
  entries: z.array(bulkUploadEntrySchema).optional(),
});

export const bulkUploadMappedFileSchema = z.object({
  fileName: z.string(),
  usn: z.string(),
  studentName: z.string(),
  estimatedDpi: z.number(),
  lowDpiWarning: z.string().nullable(),
});

export const bulkUploadSummarySchema = z.object({
  fileName: z.string(),
  kind: z.enum(['pdf', 'zip']),
  byteLength: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  usnMismatches: z.array(z.object({ fileName: z.string(), message: z.string() })),
  qualityWarnings: z.array(z.object({ fileName: z.string(), message: z.string() })),
  mapped: z.array(bulkUploadMappedFileSchema),
  uploadedTotal: z.number().int().nonnegative(),
});

export type BulkUploadBody = z.infer<typeof bulkUploadBodySchema>;
export type BulkUploadSummary = z.infer<typeof bulkUploadSummarySchema>;
