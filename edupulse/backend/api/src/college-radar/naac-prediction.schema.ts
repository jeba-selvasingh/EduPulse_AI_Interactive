import { z } from 'zod';

export const naacCriterionSchema = z.object({
  criterion: z.string(),
  gap: z.number(),
  displayGap: z.string(),
  status: z.enum(['at_risk', 'watch', 'on_target']),
});

export const naacPredictionViewSchema = z.object({
  predictedCgpa: z.number(),
  predictedGrade: z.string(),
  targetGrade: z.string(),
  targetCgpa: z.number(),
  subtitle: z.string(),
  estimateDisclaimer: z.string(),
  criteria: z.array(naacCriterionSchema),
  fastestFix: z.object({
    title: z.string(),
    body: z.string(),
    estimatedImpact: z.number(),
    weeks: z.number().int().positive(),
  }),
  trustCardId: z.string().uuid(),
});

export type NaacPredictionView = z.infer<typeof naacPredictionViewSchema>;
