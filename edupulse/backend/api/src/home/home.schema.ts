import { z } from 'zod';

export const homeStatsSchema = z.object({
  papersThisSem: z.number().int().nonnegative(),
  hoursSaved: z.number().int().nonnegative(),
});

export const attentionItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string(),
  severity: z.enum(['amber', 'red', 'neutral']),
  trustCardId: z.string().uuid().optional(),
});

export const homeSummarySchema = z.object({
  stats: homeStatsSchema,
  unreadAlertCount: z.number().int().nonnegative(),
  attentionItems: z.array(attentionItemSchema),
});

export type HomeSummary = z.infer<typeof homeSummarySchema>;
