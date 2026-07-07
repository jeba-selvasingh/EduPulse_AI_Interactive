import { z } from 'zod';

export const departmentReadinessSchema = z.object({
  department: z.string(),
  readinessScore: z.number().int().min(0).max(100),
  barPercent: z.number().int().min(0).max(100),
  color: z.string(),
});

export const accreditationWatchSchema = z.object({
  title: z.string(),
  summary: z.string(),
  items: z.array(z.string()),
});

export const weekSummarySchema = z.object({
  papersGenerated: z.number().int().nonnegative(),
  hoursSaved: z.number().int().nonnegative(),
  studentsRecovered: z.number().int().nonnegative(),
});

export const weekOverWeekSchema = z.object({
  placementPctDelta: z.number(),
  atRiskDelta: z.number(),
});

export const institutionPulseViewSchema = z.object({
  predictedPlacementPct: z.number().int().min(0).max(100),
  atRiskCount: z.number().int().nonnegative(),
  readinessByDepartment: z.array(departmentReadinessSchema),
  accreditationWatch: accreditationWatchSchema,
  weekSummary: weekSummarySchema,
  weekOverWeek: weekOverWeekSchema,
});

export type DepartmentReadiness = z.infer<typeof departmentReadinessSchema>;
export type InstitutionPulseView = z.infer<typeof institutionPulseViewSchema>;
