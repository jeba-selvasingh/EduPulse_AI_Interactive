import { z } from 'zod';

export const gapActionItemSchema = z.object({
  id: z.string(),
  priority: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  effort: z.enum(['high', 'medium', 'low']),
  impactEffortLabel: z.string(),
  owner: z.string(),
  timelineLabel: z.string().nullable(),
});

export const gapActionViewSchema = z.object({
  rivalId: z.string(),
  rivalName: z.string(),
  trustCardId: z.string().uuid(),
  sourcesLabel: z.string(),
  actions: z.array(gapActionItemSchema),
});

export type GapActionView = z.infer<typeof gapActionViewSchema>;
