import { z } from 'zod';

export const readinessTierIdSchema = z.enum(['dream', 'core', 'mass', 'at_risk']);

export const readinessWeightKeySchema = z.enum([
  'academics',
  'coding',
  'certs',
  'communication',
]);

export const readinessWeightsSchema = z.object({
  academics: z.number().min(15).max(35),
  coding: z.number().min(10).max(30),
  certs: z.number().min(5).max(25),
  communication: z.number().min(5).max(20),
});

export const updateReadinessWeightsSchema = readinessWeightsSchema;

export const readinessComponentSchema = z.object({
  key: readinessWeightKeySchema,
  label: z.string(),
  score: z.number(),
  maxScore: z.number(),
  weight: z.number(),
  weightedPoints: z.number(),
});

export const tierSummarySchema = z.object({
  tier: readinessTierIdSchema,
  label: z.string(),
  count: z.number(),
  percent: z.number(),
  barPercent: z.number(),
  color: z.string(),
});

export const studentTierCardSchema = z.object({
  usn: z.string(),
  name: z.string(),
  cgpa: z.number(),
  readinessPercent: z.number(),
  tier: readinessTierIdSchema,
  tierLabel: z.string(),
  eligibleCompanyCount: z.number(),
  totalCompanies: z.number(),
  gapSummary: z.string().optional(),
  isAtRisk: z.boolean(),
  detailRoute: z.string(),
});

export const readinessTierBoardViewSchema = z.object({
  batchLabel: z.string(),
  departmentLabel: z.string(),
  batchStrength: z.number(),
  weights: readinessWeightsSchema,
  weightBounds: readinessWeightsSchema,
  weightCaption: z.string(),
  tiers: z.array(tierSummarySchema),
  featuredStudents: z.array(studentTierCardSchema),
  sampleBreakdown: z.array(readinessComponentSchema),
});

export type ReadinessTierId = z.infer<typeof readinessTierIdSchema>;
export type ReadinessWeightKey = z.infer<typeof readinessWeightKeySchema>;
export type ReadinessWeights = z.infer<typeof readinessWeightsSchema>;
export type ReadinessComponent = z.infer<typeof readinessComponentSchema>;
export type TierSummary = z.infer<typeof tierSummarySchema>;
export type StudentTierCard = z.infer<typeof studentTierCardSchema>;
export type ReadinessTierBoardView = z.infer<typeof readinessTierBoardViewSchema>;
