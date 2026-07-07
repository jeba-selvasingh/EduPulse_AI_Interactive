import { z } from 'zod';

export const evaluationProgressSchema = z.object({
  uploaded: z.number().int().nonnegative(),
  aiEvaluated: z.number().int().nonnegative(),
  facultyReviewed: z.number().int().nonnegative(),
});

export const evaluationWorkflowDashboardSchema = z.object({
  courseCode: z.string(),
  examType: z.string(),
  paperId: z.string().nullable(),
  available: z.boolean(),
  moderationStatus: z.enum(['draft', 'submitted', 'approved', 'returned']).optional(),
  message: z.string(),
  totalStudents: z.number().int().nonnegative(),
  questionCount: z.number().int().nonnegative().optional(),
  totalMarks: z.number().int().nonnegative().optional(),
  progress: evaluationProgressSchema,
  percentComplete: evaluationProgressSchema,
});

export type EvaluationProgress = z.infer<typeof evaluationProgressSchema>;
export type EvaluationWorkflowDashboard = z.infer<typeof evaluationWorkflowDashboardSchema>;
