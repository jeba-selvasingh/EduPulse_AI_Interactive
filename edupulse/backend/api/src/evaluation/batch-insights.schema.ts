import { z } from 'zod';

export const SCORE_BANDS = [
  { band: 'O_A_PLUS', label: '75–100 (O/A+)', minPercent: 75, maxPercent: 100 },
  { band: 'A_B_PLUS', label: '60–74 (A/B+)', minPercent: 60, maxPercent: 74.99 },
  { band: 'B', label: '50–59 (B)', minPercent: 50, maxPercent: 59.99 },
  { band: 'BELOW_50', label: 'Below 50 (C/F)', minPercent: 0, maxPercent: 49.99 },
] as const;

export const QUESTION_WEAK_THRESHOLD_RATIO = 0.5;

export const scoreDistributionBucketSchema = z.object({
  band: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  percent: z.number().nonnegative(),
});

export const questionAverageSchema = z.object({
  questionId: z.string(),
  questionKey: z.string(),
  topic: z.string(),
  averageMarks: z.number().nonnegative(),
  maxMarks: z.number().int().positive(),
  averagePercent: z.number().nonnegative(),
});

export const weakestQuestionInsightSchema = z.object({
  questionId: z.string(),
  questionKey: z.string(),
  topic: z.string(),
  averageMarks: z.number().nonnegative(),
  maxMarks: z.number().int().positive(),
  thresholdMarks: z.number().nonnegative(),
  belowThresholdCount: z.number().int().nonnegative(),
  mappedCoTag: z.string().nullable(),
});

export const batchEvaluationInsightsSchema = z.object({
  courseCode: z.string(),
  examType: z.string(),
  totalStudents: z.number().int().nonnegative(),
  evaluatedCount: z.number().int().nonnegative(),
  approvedCount: z.number().int().nonnegative(),
  inReviewCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  scoreDistribution: z.array(scoreDistributionBucketSchema),
  questionAverages: z.array(questionAverageSchema),
  weakestQuestion: weakestQuestionInsightSchema.nullable(),
  insightMessage: z.string(),
});

export const heatmapRefreshResultSchema = z.object({
  courseCode: z.string(),
  examType: z.string(),
  importedCells: z.number().int().nonnegative(),
  heatmapStudentsWithMarks: z.number().int().nonnegative(),
  highlightedClusters: z.number().int().nonnegative(),
  weakestCoTag: z.string().nullable(),
  insightMessage: z.string(),
});

export type BatchEvaluationInsights = z.infer<typeof batchEvaluationInsightsSchema>;
export type HeatmapRefreshResult = z.infer<typeof heatmapRefreshResultSchema>;
export type QuestionAverage = z.infer<typeof questionAverageSchema>;
export type WeakestQuestionInsight = z.infer<typeof weakestQuestionInsightSchema>;
