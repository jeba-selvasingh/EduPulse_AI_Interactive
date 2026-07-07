import { z } from 'zod';

export const institutionSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

export const institutionListSchema = z.object({
  data: z.array(institutionSummarySchema),
});

export const institutionDetailSchema = institutionSummarySchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type InstitutionSummary = z.infer<typeof institutionSummarySchema>;
export type InstitutionDetail = z.infer<typeof institutionDetailSchema>;
