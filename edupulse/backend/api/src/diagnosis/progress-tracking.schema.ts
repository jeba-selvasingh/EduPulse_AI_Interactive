import { z } from 'zod';

export const progressTrendSchema = z.enum(['up', 'stable', 'down']);
export type ProgressTrend = z.infer<typeof progressTrendSchema>;

export const readinessTrendLabelSchema = z.enum(['improving', 'stable', 'declining']);
export type ReadinessTrendLabel = z.infer<typeof readinessTrendLabelSchema>;

export const readinessPointSchema = z.object({
  label: z.string(),
  sublabel: z.string(),
  score: z.number().int().min(0).max(100),
  barHeightPercent: z.number().min(0).max(100),
  color: z.string(),
});

export const conceptDeltaSchema = z.object({
  conceptName: z.string(),
  fromScore: z.number().int().min(0).max(100),
  toScore: z.number().int().min(0).max(100),
  trend: progressTrendSchema,
  deltaLabel: z.string(),
});

export const companiesEligibilityDeltaSchema = z.object({
  fromCount: z.number().int().nonnegative(),
  toCount: z.number().int().nonnegative(),
  trend: progressTrendSchema,
  deltaLabel: z.string(),
});

export const progressTrackingViewSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  readinessTrendLabel: readinessTrendLabelSchema,
  readinessPoints: z.array(readinessPointSchema).min(3),
  conceptDeltas: z.array(conceptDeltaSchema),
  companiesEligibility: companiesEligibilityDeltaSchema,
  projection: z.object({
    summary: z.string(),
    assumptions: z.array(z.string()),
  }),
  dataPointCount: z.number().int().min(3),
});

export type ProgressTrackingView = z.infer<typeof progressTrackingViewSchema>;
export type ReadinessPoint = z.infer<typeof readinessPointSchema>;
export type ConceptDelta = z.infer<typeof conceptDeltaSchema>;
export type CompaniesEligibilityDelta = z.infer<typeof companiesEligibilityDeltaSchema>;
