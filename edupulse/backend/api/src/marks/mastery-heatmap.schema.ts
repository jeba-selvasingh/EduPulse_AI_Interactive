import { z } from 'zod';

export const masteryBandSchema = z.enum(['green', 'amber', 'red', 'missing']);

export const masteryCellSchema = z.object({
  coTag: z.string(),
  masteryPercent: z.number().int().min(0).max(100).nullable(),
  band: masteryBandSchema,
});

export const masteryHeatmapRowSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  cells: z.array(masteryCellSchema),
});

export const weakClusterSchema = z.object({
  coTag: z.string(),
  title: z.string(),
  weakCount: z.number().int().nonnegative(),
  studentsWithData: z.number().int().nonnegative(),
  weakPercent: z.number().nonnegative(),
  isHighlighted: z.boolean(),
});

export const masteryHeatmapSchema = z.object({
  assessmentId: z.string(),
  courseCode: z.string(),
  examType: z.string(),
  institutionId: z.string().uuid(),
  courseOutcomes: z.array(
    z.object({
      coTag: z.string(),
      title: z.string(),
    }),
  ),
  rows: z.array(masteryHeatmapRowSchema),
  weakClusters: z.array(weakClusterSchema),
  computedAt: z.string().datetime(),
  studentsWithMarks: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
});

export type MasteryBand = z.infer<typeof masteryBandSchema>;
export type MasteryCell = z.infer<typeof masteryCellSchema>;
export type MasteryHeatmapRow = z.infer<typeof masteryHeatmapRowSchema>;
export type WeakCluster = z.infer<typeof weakClusterSchema>;
export type MasteryHeatmap = z.infer<typeof masteryHeatmapSchema>;
