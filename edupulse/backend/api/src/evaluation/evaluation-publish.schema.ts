import { z } from 'zod';

export const pendingReviewItemSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  questionId: z.string(),
  questionKey: z.string(),
});

export const publishStatusSchema = z.object({
  courseCode: z.string(),
  examType: z.string(),
  evaluatedCount: z.number().int().nonnegative(),
  canPublish: z.boolean(),
  isPublished: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  publishedBy: z.string().nullable(),
  source: z.enum(['evaluation_ai', 'manual']).nullable(),
  pendingReviews: z.array(pendingReviewItemSchema),
  message: z.string(),
});

export const publishMarksResultSchema = z.object({
  status: z.literal('published'),
  batchId: z.string(),
  courseCode: z.string(),
  examType: z.string(),
  importedCells: z.number().int().nonnegative(),
  publishedStudents: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
  source: z.literal('evaluation_ai'),
  message: z.string(),
});

export const facultyReviewWaiveSchema = z.object({
  waiverReason: z.string().min(1).max(500),
});

export type PublishStatus = z.infer<typeof publishStatusSchema>;
export type PublishMarksResult = z.infer<typeof publishMarksResultSchema>;
export type PendingReviewItem = z.infer<typeof pendingReviewItemSchema>;
