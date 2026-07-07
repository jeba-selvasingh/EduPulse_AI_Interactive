import { z } from 'zod';

export const cutoffYearPointSchema = z.object({
  year: z.number().int(),
  closingRank: z.number().int(),
  label: z.string(),
  barPercent: z.number().int().min(0).max(100),
});

export const cutoffComparisonSchema = z.object({
  label: z.string(),
  closingRank: z.number().int(),
  displayRank: z.string(),
  direction: z.enum(['up', 'down', 'flat']),
});

export const cutoffTrackerViewSchema = z.object({
  examLabel: z.string(),
  branch: z.string(),
  trendDirection: z.enum(['improving', 'slipping', 'stable']),
  trendNarrative: z.string(),
  signalNarrative: z.string(),
  pesTrend: z.array(cutoffYearPointSchema),
  comparisons: z.array(cutoffComparisonSchema),
});

export type CutoffTrackerView = z.infer<typeof cutoffTrackerViewSchema>;
