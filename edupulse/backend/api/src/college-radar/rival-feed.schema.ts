import { z } from 'zod';

export const rivalFeedItemSchema = z.object({
  id: z.string().uuid(),
  rivalId: z.string(),
  title: z.string(),
  summary: z.string(),
  sourceUrl: z.string().url(),
  sourceLabel: z.string(),
  relativeTime: z.string(),
  publishedAt: z.string(),
});

export const rivalFeedViewSchema = z.object({
  newThisWeek: z.number().int().nonnegative(),
  items: z.array(rivalFeedItemSchema),
});

export const upsertFeedItemSchema = z.object({
  rivalId: z.enum(['rival-a', 'rival-b', 'rival-c', 'rival-d']),
  title: z.string().min(1),
  summary: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceLabel: z.string().min(1),
  relativeTime: z.string().optional(),
});

export type RivalFeedView = z.infer<typeof rivalFeedViewSchema>;
export type RivalFeedItem = z.infer<typeof rivalFeedItemSchema>;
