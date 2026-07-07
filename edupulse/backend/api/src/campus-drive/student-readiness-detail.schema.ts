import { z } from 'zod';
import { readinessComponentSchema, readinessTierIdSchema } from './readiness-tier.schema';

export const interventionModuleLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  route: z.string(),
  priority: z.enum(['urgent', 'high', 'medium', 'quick_win']).optional(),
});

export const studentReadinessDetailViewSchema = z.object({
  usn: z.string(),
  name: z.string(),
  departmentLabel: z.string(),
  batchLabel: z.string(),
  readinessPercent: z.number(),
  tier: readinessTierIdSchema,
  tierLabel: z.string(),
  trendLabel: z.string(),
  breakdown: z.array(readinessComponentSchema),
  eligibleCompanyCount: z.number(),
  totalCompanies: z.number(),
  companyFitSummary: z.string(),
  gapAnalysis: z.string(),
  gapPlanTitle: z.string(),
  gapPlanSummary: z.string(),
  interventionModules: z.array(interventionModuleLinkSchema),
  evaluationRoute: z.string(),
});

export type InterventionModuleLink = z.infer<typeof interventionModuleLinkSchema>;
export type StudentReadinessDetailView = z.infer<typeof studentReadinessDetailViewSchema>;
