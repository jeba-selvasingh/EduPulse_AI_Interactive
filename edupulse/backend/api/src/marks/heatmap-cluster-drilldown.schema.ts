import { z } from 'zod';
import { masteryBandSchema } from './mastery-heatmap.schema';

export const heatmapDrilldownScopeSchema = z.enum(['weak', 'all']);

export const heatmapClusterStudentSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  masteryPercent: z.number().int().min(0).max(100),
  band: masteryBandSchema,
  diagnosisRoute: z.string(),
});

export const heatmapClusterDrilldownSchema = z.object({
  courseCode: z.string(),
  examType: z.string(),
  coTag: z.string(),
  title: z.string(),
  scope: heatmapDrilldownScopeSchema,
  cluster: z.object({
    weakCount: z.number().int().nonnegative(),
    studentsWithData: z.number().int().nonnegative(),
    weakPercent: z.number().nonnegative(),
    isHighlighted: z.boolean(),
  }),
  students: z.array(heatmapClusterStudentSchema),
  diagnosisEntryRoute: z.string(),
});

export type HeatmapDrilldownScope = z.infer<typeof heatmapDrilldownScopeSchema>;
export type HeatmapClusterDrilldown = z.infer<typeof heatmapClusterDrilldownSchema>;
