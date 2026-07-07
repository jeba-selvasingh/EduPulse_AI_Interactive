import { z } from 'zod';

export const assessmentQuestionSchema = z.object({
  id: z.string(),
  questionKey: z.string(),
  maxMarks: z.number().int().positive(),
});

export const markCellSchema = z.object({
  usn: z.string(),
  questionId: z.string(),
  marks: z.number().int().min(0).nullable(),
  isSaved: z.boolean(),
  isReadOnly: z.boolean().optional(),
  validationError: z.string().nullable().optional(),
});

export const marksGridRowSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  cells: z.array(markCellSchema),
  rowTotal: z.number().int().min(0).nullable(),
});

export const marksCompletionSchema = z.object({
  savedCells: z.number().int().nonnegative(),
  totalCells: z.number().int().nonnegative(),
  completedStudents: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
});

export const marksGridSchema = z.object({
  assessmentId: z.string(),
  courseCode: z.string(),
  examType: z.string(),
  institutionId: z.string().uuid(),
  questions: z.array(assessmentQuestionSchema),
  rows: z.array(marksGridRowSchema),
  completion: marksCompletionSchema,
  lastSavedAt: z.string().datetime().nullable(),
  lastSavedBy: z.string().nullable(),
  isPublished: z.boolean(),
  isReadOnly: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  publishedBy: z.string().nullable(),
  source: z.enum(['evaluation_ai', 'manual']).nullable(),
  publishBatchId: z.string().nullable(),
});

export const partialSaveCellSchema = z.object({
  usn: z.string().min(3),
  questionId: z.string().min(1),
  marks: z.union([z.number().int().min(0), z.null()]),
});

export const partialSaveBodySchema = z.object({
  cells: z.array(partialSaveCellSchema).min(1).max(200),
});

export const partialSaveResultSchema = z.object({
  grid: marksGridSchema,
  rejected: z.array(
    z.object({
      usn: z.string(),
      questionId: z.string(),
      message: z.string(),
    }),
  ),
});

export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;
export type MarkCell = z.infer<typeof markCellSchema>;
export type MarksGridRow = z.infer<typeof marksGridRowSchema>;
export type MarksCompletion = z.infer<typeof marksCompletionSchema>;
export type MarksGrid = z.infer<typeof marksGridSchema>;
export type PartialSaveResult = z.infer<typeof partialSaveResultSchema>;
