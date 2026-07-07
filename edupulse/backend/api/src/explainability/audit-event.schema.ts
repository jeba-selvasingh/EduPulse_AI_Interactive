import { z } from 'zod';

export const auditEventTypeSchema = z.enum(['override', 'approval', 'edit']);

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  artifactId: z.string().uuid(),
  eventType: auditEventTypeSchema,
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string().email(),
  institutionId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  summary: z.string().min(1).max(500),
  field: z.string().max(100).optional(),
  beforeValue: z.string().max(2000).optional(),
  afterValue: z.string().max(2000).optional(),
});

export const appendAuditEventSchema = z.object({
  artifactId: z.string().uuid(),
  eventType: auditEventTypeSchema,
  summary: z.string().min(1).max(500),
  field: z.string().max(100).optional(),
  beforeValue: z.string().max(2000).optional(),
  afterValue: z.string().max(2000).optional(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;
export type AppendAuditEventInput = z.infer<typeof appendAuditEventSchema>;
