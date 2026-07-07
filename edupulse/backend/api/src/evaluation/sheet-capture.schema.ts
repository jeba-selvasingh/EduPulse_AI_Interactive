import { z } from 'zod';

const cornerPointSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]);

export const analyzeCaptureBodySchema = z.object({
  cornerPoints: z.array(cornerPointSchema).optional(),
  headerText: z.string().optional(),
});

export const confirmCaptureBodySchema = z.object({
  captureId: z.string().uuid(),
  usn: z.string().min(1),
});

export const sheetCaptureAnalyzeSchema = z.object({
  captureId: z.string().uuid(),
  cornersDetected: z.boolean(),
  cornerWarning: z.string().nullable(),
  usnDetected: z.string().nullable(),
  usnConfidence: z.number().nullable(),
  requiresManualUsn: z.boolean(),
});

export const sheetCaptureConfirmSchema = z.object({
  captureId: z.string().uuid(),
  usn: z.string(),
  studentName: z.string(),
  pageNumber: z.number().int().positive(),
  uploadedTotal: z.number().int().nonnegative(),
});

export type AnalyzeCaptureBody = z.infer<typeof analyzeCaptureBodySchema>;
export type ConfirmCaptureBody = z.infer<typeof confirmCaptureBodySchema>;
export type SheetCaptureAnalyze = z.infer<typeof sheetCaptureAnalyzeSchema>;
export type SheetCaptureConfirm = z.infer<typeof sheetCaptureConfirmSchema>;
