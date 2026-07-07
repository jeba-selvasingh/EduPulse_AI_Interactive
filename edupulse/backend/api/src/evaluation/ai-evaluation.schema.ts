import { z } from 'zod';

export const REVIEW_CONFIDENCE_THRESHOLD = 0.75;
export const MAX_SHEET_EVALUATION_MS = 90_000;

export const questionEvaluationSchema = z.object({
  questionId: z.string(),
  questionKey: z.string(),
  maxMarks: z.number().int().positive(),
  marksAwarded: z.number().nonnegative(),
  aiMarksAwarded: z.number().nonnegative(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  flaggedForReview: z.boolean(),
  reviewStatus: z.enum(['pending', 'accepted', 'overridden', 'waived']),
  facultyNote: z.string().nullable().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
  trustCardId: z.string().uuid(),
});

export const flaggedReviewItemSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  questionId: z.string(),
  questionKey: z.string(),
  maxMarks: z.number().int().positive(),
  marksAwarded: z.number().nonnegative(),
  aiMarksAwarded: z.number().nonnegative(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  reviewStatus: z.enum(['pending', 'accepted', 'overridden', 'waived']),
  facultyNote: z.string().nullable().optional(),
  trustCardId: z.string().uuid(),
});

export const facultyReviewDetailSchema = flaggedReviewItemSchema.extend({
  scannedSnippet: z.string(),
  snippetCaption: z.string(),
});

export const facultyReviewAcceptSchema = z.object({});

export const facultyReviewOverrideSchema = z.object({
  marksAwarded: z.number().nonnegative(),
  facultyNote: z.string().min(1).max(500),
});

export const sheetEvaluationSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  courseCode: z.string(),
  examType: z.string(),
  paperId: z.string().uuid().nullable(),
  totalMarks: z.number().nonnegative(),
  maxTotalMarks: z.number().int().positive(),
  durationMs: z.number().int().nonnegative(),
  modelName: z.string(),
  promptVersion: z.string(),
  trustCardId: z.string().uuid(),
  questions: z.array(questionEvaluationSchema),
  flaggedQuestionCount: z.number().int().nonnegative(),
  evaluatedAt: z.string().datetime(),
});

export type QuestionEvaluation = z.infer<typeof questionEvaluationSchema>;
export type SheetEvaluation = z.infer<typeof sheetEvaluationSchema>;
export type FlaggedReviewItem = z.infer<typeof flaggedReviewItemSchema>;
export type FacultyReviewDetail = z.infer<typeof facultyReviewDetailSchema>;
export type FacultyReviewOverrideInput = z.infer<typeof facultyReviewOverrideSchema>;
