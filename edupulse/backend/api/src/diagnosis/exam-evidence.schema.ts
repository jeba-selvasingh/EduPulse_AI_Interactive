import { z } from 'zod';

export const examQuestionEvidenceSchema = z.object({
  questionId: z.string(),
  label: z.string(),
  topic: z.string(),
  bloomLevel: z.number().int().min(1).max(6),
  marksAwarded: z.number().nonnegative(),
  maxMarks: z.number().int().positive(),
  classAverageMarks: z.number().nonnegative(),
  rubricFeedback: z.string(),
  isWeak: z.boolean(),
  improvementRoute: z.string(),
});

export type ExamQuestionEvidence = z.infer<typeof examQuestionEvidenceSchema>;

export const examEvidenceSummarySchema = z.object({
  classAverageTotal: z.number().nonnegative(),
  studentTotal: z.number().nonnegative(),
  maxTotalMarks: z.number().int().positive(),
  deltaFromClassAverage: z.number(),
  insight: z.string(),
});

export const examEvidenceViewSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  examType: z.string(),
  isPublished: z.boolean(),
  totalMarks: z.number().nonnegative(),
  maxTotalMarks: z.number().int().positive(),
  questions: z.array(examQuestionEvidenceSchema),
  summary: examEvidenceSummarySchema,
  improvementPlanRoute: z.string(),
});

export type ExamEvidenceView = z.infer<typeof examEvidenceViewSchema>;
