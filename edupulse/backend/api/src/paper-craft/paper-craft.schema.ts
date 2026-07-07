import { z } from 'zod';

export const MAX_GENERATION_QUESTIONS = 15;
export const DEFAULT_GENERATION_QUESTIONS = 10;
export const GENERATION_TIMEOUT_MS = 120_000;

export const bloomLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const difficultyBandSchema = z.enum(['easy', 'moderate', 'hard']);

export const similarityWarningSchema = z.object({
  similarityPct: z.number().int().min(0).max(100),
  matchedReference: z.string(),
});

export const generatedQuestionSchema = z.object({
  id: z.string().uuid(),
  questionKey: z.string(),
  moduleNumber: z.number().int().positive(),
  moduleTitle: z.string(),
  marks: z.number().int().positive(),
  bloomLevel: bloomLevelSchema,
  coTag: z.string(),
  poTag: z.string(),
  difficulty: difficultyBandSchema,
  text: z.string(),
  trustCardId: z.string().uuid(),
  similarityWarning: similarityWarningSchema.nullable().optional(),
  stemVariant: z.number().int().nonnegative().optional(),
});

export const questionPaperSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  courseCode: z.string(),
  examType: z.string(),
  syllabusVersionId: z.string().uuid(),
  syllabusVersion: z.number().int().positive(),
  blueprintId: z.string().uuid(),
  trustCardId: z.string().uuid(),
  totalMarks: z.number().int().positive(),
  questionCount: z.number().int().positive(),
  durationMs: z.number().int().nonnegative(),
  generatedBy: z.string(),
  generatedAt: z.string().datetime(),
  questions: z.array(generatedQuestionSchema),
});

export const generatePaperBodySchema = z.object({
  courseCode: z.string().optional(),
  syllabusVersionId: z.string().uuid().optional(),
  acknowledgeSuperseded: z.boolean().optional(),
  questionCount: z.number().int().min(1).max(MAX_GENERATION_QUESTIONS).optional(),
});

export type BloomLevel = z.infer<typeof bloomLevelSchema>;
export type DifficultyBand = z.infer<typeof difficultyBandSchema>;
export type SimilarityWarning = z.infer<typeof similarityWarningSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type QuestionPaper = z.infer<typeof questionPaperSchema>;
