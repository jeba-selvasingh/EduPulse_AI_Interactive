import { z } from 'zod';

export const moderationStatusSchema = z.enum(['draft', 'submitted', 'approved', 'returned']);

export const paperModerationRecordSchema = z.object({
  paperId: z.string().uuid(),
  institutionId: z.string().uuid(),
  courseCode: z.string(),
  examType: z.string(),
  trustCardId: z.string().uuid(),
  status: moderationStatusSchema,
  submittedBy: z.string().nullable(),
  submittedAt: z.string().datetime().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  changeComments: z.string().nullable(),
  isLocked: z.boolean(),
  answerSheetUnlocked: z.boolean(),
});

export const submitModerationBodySchema = z.object({
  note: z.string().max(500).optional(),
});

export const returnModerationBodySchema = z.object({
  comments: z.string().min(1).max(2000),
});

export const approveModerationBodySchema = z.object({
  note: z.string().max(500).optional(),
});

export type ModerationStatus = z.infer<typeof moderationStatusSchema>;
export type PaperModerationRecord = z.infer<typeof paperModerationRecordSchema>;

export function isModerationLocked(status: ModerationStatus): boolean {
  return status === 'submitted' || status === 'approved';
}
