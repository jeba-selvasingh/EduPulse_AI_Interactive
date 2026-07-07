import { z } from 'zod';
import { auditEventSchema } from '../explainability/audit-event.schema';

export const trustCardSourceSchema = z.object({
  label: z.string(),
  kind: z.enum(['pattern_profile', 'syllabus', 'exemplar', 'evaluation', 'insight', 'other']),
});

export const trustCardSchema = z.object({
  id: z.string().uuid(),
  artifactType: z.enum([
    'question',
    'answer_key',
    'evaluation',
    'insight',
    'question_paper',
  ]),
  artifactLabel: z.string(),
  modelName: z.string(),
  promptVersion: z.string(),
  confidence: z.number().min(0).max(1),
  blueprintCheckStatus: z.enum(['pass', 'fail', 'pending']),
  sources: z.array(trustCardSourceSchema),
  auditTrail: z.array(auditEventSchema),
  verified: z.boolean(),
});

export type TrustCard = z.infer<typeof trustCardSchema>;
