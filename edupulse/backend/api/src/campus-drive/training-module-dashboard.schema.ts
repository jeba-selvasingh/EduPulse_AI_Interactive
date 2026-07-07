import { z } from 'zod';

export const trainingTrackIdSchema = z.enum(['aptitude', 'soft_skills', 'technical']);

export const trainingModuleMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  batchAvgPercent: z.number(),
  targetPercent: z.number(),
  statusLabel: z.string(),
  statusTone: z.enum(['weak', 'moderate', 'good', 'priority']),
  isWeakestInTrack: z.boolean(),
});

export const trainingTrackSummarySchema = z.object({
  track: trainingTrackIdSchema,
  title: z.string(),
  subtitle: z.string(),
  batchAvgPercent: z.number(),
  batchAvgLabel: z.string(),
  benchmarkPercent: z.number(),
  benchmarkLabel: z.string(),
  belowBenchmarkCount: z.number(),
  gapSummary: z.string(),
  modules: z.array(trainingModuleMetricSchema),
  detailRoute: z.string(),
  interventionRoute: z.string(),
});

export const trainingDashboardsViewSchema = z.object({
  batchLabel: z.string(),
  batchStrength: z.number(),
  activeTrack: trainingTrackIdSchema.nullable(),
  tracks: z.array(trainingTrackSummarySchema),
  weakestTrackId: trainingTrackIdSchema,
  weakestTrackLabel: z.string(),
  interventionPriorityRoute: z.string(),
  interventionSummary: z.string(),
});

export type TrainingTrackId = z.infer<typeof trainingTrackIdSchema>;
export type TrainingModuleMetric = z.infer<typeof trainingModuleMetricSchema>;
export type TrainingTrackSummary = z.infer<typeof trainingTrackSummarySchema>;
export type TrainingDashboardsView = z.infer<typeof trainingDashboardsViewSchema>;
