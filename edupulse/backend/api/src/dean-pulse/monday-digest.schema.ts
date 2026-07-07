import { z } from 'zod';

export const digestChannelSchema = z.enum(['in_app', 'whatsapp']);

export const digestPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
});

export const mondayDigestContentSchema = z.object({
  weekLabel: z.string(),
  papersGenerated: z.number().int().nonnegative(),
  hoursSaved: z.number().int().nonnegative(),
  studentsRecovered: z.number().int().nonnegative(),
  headline: z.string(),
  body: z.string(),
});

export const mondayDigestDeliverySchema = z.object({
  channel: digestChannelSchema,
  status: z.enum(['delivered', 'skipped', 'queued', 'opted_out']),
  deliveredAt: z.string().nullable(),
  queueId: z.string().nullable(),
});

export const mondayDigestViewSchema = z.object({
  digest: mondayDigestContentSchema,
  preferences: digestPreferencesSchema,
  lastDelivery: z.array(mondayDigestDeliverySchema),
});

export const updateDigestPreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
});

export type MondayDigestView = z.infer<typeof mondayDigestViewSchema>;
export type DigestPreferences = z.infer<typeof digestPreferencesSchema>;
