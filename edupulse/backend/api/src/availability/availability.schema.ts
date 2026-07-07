import { z } from 'zod';

export const componentIdSchema = z.enum([
  'api',
  'worker',
  'postgresql',
  'redis',
  'minio',
  'llm',
]);

export const componentHealthSchema = z.object({
  id: componentIdSchema,
  status: z.enum(['ok', 'degraded', 'down']),
  latencyMs: z.number().int().nonnegative(),
  message: z.string().optional(),
});

export const examWindowSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  courseCode: z.string(),
  label: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  sloTargetPct: z.number().min(0).max(100),
});

export const maintenanceWindowSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  announcedAt: z.string().datetime(),
  excludeFromSlo: z.boolean(),
});

export const createExamWindowSchema = z.object({
  courseCode: z.string().min(2).max(32),
  label: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  sloTargetPct: z.number().min(90).max(100).optional(),
});

export const scheduleMaintenanceSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const deepHealthSchema = z.object({
  checkedAt: z.string().datetime(),
  examWindowActive: z.boolean(),
  components: z.array(componentHealthSchema),
  sloPct: z.number().nullable(),
  sloTargetPct: z.number().nullable(),
});

export const sloSummarySchema = z.object({
  windowLabel: z.string().nullable(),
  sloTargetPct: z.number(),
  measuredSloPct: z.number(),
  probeCount: z.number().int().nonnegative(),
  maintenanceExcludedMinutes: z.number().int().nonnegative(),
  meetsTarget: z.boolean(),
});

export const bannerSchema = z.object({
  visible: z.boolean(),
  kind: z.enum(['maintenance', 'exam', 'none']),
  title: z.string().optional(),
  message: z.string().optional(),
  startsAt: z.string().datetime().optional(),
});

export const incidentSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  examWindowId: z.string().uuid(),
  componentId: componentIdSchema,
  correlationId: z.string(),
  occurredAt: z.string().datetime(),
  summary: z.string(),
  resolved: z.boolean(),
});

export type ComponentId = z.infer<typeof componentIdSchema>;
export type ComponentHealth = z.infer<typeof componentHealthSchema>;
export type ExamWindow = z.infer<typeof examWindowSchema>;
export type MaintenanceWindow = z.infer<typeof maintenanceWindowSchema>;
export type DeepHealth = z.infer<typeof deepHealthSchema>;
export type SloSummary = z.infer<typeof sloSummarySchema>;
export type Incident = z.infer<typeof incidentSchema>;
