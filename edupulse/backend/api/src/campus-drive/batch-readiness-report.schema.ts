import { z } from 'zod';
import { readinessTierIdSchema } from './readiness-tier.schema';

export const reportGapSeveritySchema = z.enum(['high', 'medium', 'critical']);

export const reportTierRowSchema = z.object({
  tier: readinessTierIdSchema,
  label: z.string(),
  count: z.number(),
  percent: z.number(),
  barPercent: z.number(),
  color: z.string(),
});

export const reportGapRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  studentCount: z.number(),
  severity: reportGapSeveritySchema,
  countLabel: z.string(),
});

export const reportDepartmentRowSchema = z.object({
  department: z.string(),
  readinessPercent: z.number(),
  barPercent: z.number(),
  color: z.string(),
});

export const recoveryForecastSchema = z.object({
  currentPlacementPercent: z.number(),
  projectedPlacementPercent: z.number(),
  atRiskToCoreCount: z.number(),
  summary: z.string(),
});

export const batchReadinessReportViewSchema = z.object({
  reportTitle: z.string(),
  batchLabel: z.string(),
  batchStrength: z.number(),
  generatedAt: z.string(),
  tierDistribution: z.array(reportTierRowSchema),
  topGaps: z.array(reportGapRowSchema),
  departmentReadiness: z.array(reportDepartmentRowSchema),
  recoveryForecast: recoveryForecastSchema,
  interventionPriorityRoute: z.string(),
});

export const batchReadinessExportFormatSchema = z.enum(['pdf', 'excel']);

export const batchReadinessExportResultSchema = z.object({
  format: batchReadinessExportFormatSchema,
  fileName: z.string(),
  mimeType: z.string(),
  base64: z.string(),
  exportedAt: z.string(),
  exportedBy: z.string(),
  exportedByName: z.string(),
});

export type ReportGapSeverity = z.infer<typeof reportGapSeveritySchema>;
export type ReportTierRow = z.infer<typeof reportTierRowSchema>;
export type ReportGapRow = z.infer<typeof reportGapRowSchema>;
export type ReportDepartmentRow = z.infer<typeof reportDepartmentRowSchema>;
export type RecoveryForecast = z.infer<typeof recoveryForecastSchema>;
export type BatchReadinessReportView = z.infer<typeof batchReadinessReportViewSchema>;
export type BatchReadinessExportFormat = z.infer<typeof batchReadinessExportFormatSchema>;
export type BatchReadinessExportResult = z.infer<typeof batchReadinessExportResultSchema>;
