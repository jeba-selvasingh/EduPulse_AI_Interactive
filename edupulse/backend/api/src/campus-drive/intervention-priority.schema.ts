import { z } from 'zod';

export const interventionUrgencySchema = z.enum(['urgent', 'high', 'medium', 'quick_win']);

export const interventionCompletionStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
]);

export const interventionFocusSchema = z.enum([
  'all',
  'backlog',
  'aptitude',
  'soft_skills',
  'technical',
  'certification',
]);

export const interventionItemSchema = z.object({
  id: z.string(),
  rank: z.number(),
  title: z.string(),
  cohortSize: z.number(),
  urgency: interventionUrgencySchema,
  urgencyLabel: z.string(),
  description: z.string(),
  owner: z.string(),
  focusTags: z.array(z.string()),
  completionStatus: interventionCompletionStatusSchema,
  completionPercent: z.number().optional(),
  completionNote: z.string().optional(),
});

export const interventionRecoveryForecastSchema = z.object({
  currentPlacementPercent: z.number(),
  projectedPlacementPercent: z.number(),
  additionalOffers: z.number(),
  summary: z.string(),
});

export const interventionPriorityViewSchema = z.object({
  batchLabel: z.string(),
  activeFocus: interventionFocusSchema,
  availableFocuses: z.array(
    z.object({
      id: interventionFocusSchema,
      label: z.string(),
    }),
  ),
  interventions: z.array(interventionItemSchema),
  recoveryForecast: interventionRecoveryForecastSchema,
});

export const interventionCompletionUpdateSchema = z.object({
  status: interventionCompletionStatusSchema,
  completionPercent: z.number().min(0).max(100).optional(),
  completionNote: z.string().max(200).optional(),
});

export type InterventionUrgency = z.infer<typeof interventionUrgencySchema>;
export type InterventionCompletionStatus = z.infer<typeof interventionCompletionStatusSchema>;
export type InterventionFocus = z.infer<typeof interventionFocusSchema>;
export type InterventionItem = z.infer<typeof interventionItemSchema>;
export type InterventionRecoveryForecast = z.infer<typeof interventionRecoveryForecastSchema>;
export type InterventionPriorityView = z.infer<typeof interventionPriorityViewSchema>;
export type InterventionCompletionUpdate = z.infer<typeof interventionCompletionUpdateSchema>;
