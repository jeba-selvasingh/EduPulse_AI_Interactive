import { z } from 'zod';

export const alertTypeSchema = z.enum([
  'at_risk',
  'approval_needed',
  'recovery_win',
]);

export const alertSeveritySchema = z.enum(['red', 'amber', 'green']);

export const alertItemSchema = z.object({
  id: z.string().uuid(),
  type: alertTypeSchema,
  title: z.string(),
  body: z.string(),
  relativeTime: z.string(),
  severity: alertSeveritySchema,
  isRead: z.boolean(),
  ctaLabel: z.string().nullable(),
  ctaRoute: z.string().nullable(),
});

export const alertInboxViewSchema = z.object({
  alerts: z.array(alertItemSchema),
  unreadCount: z.number().int().nonnegative(),
});

export type AlertItem = z.infer<typeof alertItemSchema>;
export type AlertInboxView = z.infer<typeof alertInboxViewSchema>;
