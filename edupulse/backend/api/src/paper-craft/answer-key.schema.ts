import { z } from 'zod';

export const rubricMarkStepSchema = z.object({
  label: z.string().min(1).max(200),
  marks: z.number().int().positive(),
});

export const questionAnswerKeySchema = z.object({
  questionId: z.string().uuid(),
  questionKey: z.string(),
  maxMarks: z.number().int().positive(),
  modelAnswer: z.string().min(1),
  rubricSteps: z.array(rubricMarkStepSchema).min(1),
  trustCardId: z.string().uuid(),
  rubricTotal: z.number().int().positive(),
  isValid: z.boolean(),
  editedAt: z.string().datetime().nullable().optional(),
  editedBy: z.string().nullable().optional(),
});

export const paperAnswerKeySchema = z.object({
  paperId: z.string().uuid(),
  institutionId: z.string().uuid(),
  courseCode: z.string(),
  examType: z.string(),
  generatedAt: z.string().datetime(),
  generatedBy: z.string(),
  questions: z.array(questionAnswerKeySchema),
});

export const updateModelAnswerBodySchema = z.object({
  modelAnswer: z.string().min(1).max(8000),
});

export type RubricMarkStep = z.infer<typeof rubricMarkStepSchema>;
export type QuestionAnswerKey = z.infer<typeof questionAnswerKeySchema>;
export type PaperAnswerKey = z.infer<typeof paperAnswerKeySchema>;

export function sumRubricMarks(steps: RubricMarkStep[]): number {
  return steps.reduce((total, step) => total + step.marks, 0);
}

export function isRubricValid(steps: RubricMarkStep[], maxMarks: number): boolean {
  return sumRubricMarks(steps) === maxMarks;
}
