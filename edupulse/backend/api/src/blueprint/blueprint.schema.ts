import { z } from 'zod';

export const PILOT_EXAM_TYPE = 'SEE' as const;

export const examTypeSchema = z.enum(['SEE', 'IA-1', 'IA-2']);

export const difficultyProfileSchema = z.object({
  easy: z.number().int().min(0).max(100),
  moderate: z.number().int().min(0).max(100),
  hard: z.number().int().min(0).max(100),
});

export const bloomTargetsSchema = z.object({
  l1: z.number().int().min(0).max(100),
  l2: z.number().int().min(0).max(100),
  l3: z.number().int().min(0).max(100),
  l4: z.number().int().min(0).max(100),
  l5: z.number().int().min(0).max(100),
});

export const patternProfileSchema = z.object({
  code: z.string(),
  label: z.string(),
  learnedFromPapers: z.number().int().positive(),
  summary: z.string(),
});

export const blueprintRecordSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  courseCode: z.string(),
  examType: examTypeSchema,
  difficulty: difficultyProfileSchema,
  bloom: bloomTargetsSchema,
  updatedBy: z.string(),
  updatedAt: z.string().datetime(),
});

export const blueprintViewSchema = z.object({
  blueprint: blueprintRecordSchema,
  patternProfile: patternProfileSchema,
  validation: z.object({
    difficultyTotal: z.number().int(),
    bloomTotal: z.number().int(),
    isValid: z.boolean(),
  }),
});

export const upsertBlueprintBodySchema = z.object({
  examType: examTypeSchema.optional(),
  difficulty: difficultyProfileSchema,
  bloom: bloomTargetsSchema,
});

export type DifficultyProfile = z.infer<typeof difficultyProfileSchema>;
export type BloomTargets = z.infer<typeof bloomTargetsSchema>;
export type PatternProfile = z.infer<typeof patternProfileSchema>;
export type BlueprintRecord = z.infer<typeof blueprintRecordSchema>;
export type BlueprintView = z.infer<typeof blueprintViewSchema>;

export function sumDifficulty(d: DifficultyProfile): number {
  return d.easy + d.moderate + d.hard;
}

export function sumBloom(b: BloomTargets): number {
  return b.l1 + b.l2 + b.l3 + b.l4 + b.l5;
}

export function isBlueprintValid(
  difficulty: DifficultyProfile,
  bloom: BloomTargets,
): boolean {
  return sumDifficulty(difficulty) === 100 && sumBloom(bloom) === 100;
}
