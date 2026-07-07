import { z } from 'zod';

export const nirfParameterSchema = z.object({
  key: z.string(),
  label: z.string(),
  definition: z.string(),
  pesScore: z.number(),
  rivalScore: z.number(),
  comparisonLabel: z.string(),
  pesAhead: z.boolean(),
});

export const nirfRadarViewSchema = z.object({
  dataYear: z.number().int(),
  institutionName: z.string(),
  rivalId: z.string(),
  rivalName: z.string(),
  parameters: z.array(nirfParameterSchema),
});

export type NirfRadarView = z.infer<typeof nirfRadarViewSchema>;
