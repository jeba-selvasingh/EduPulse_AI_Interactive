import { z } from 'zod';

export const strengthWeightSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const coCoverageStatusSchema = z.enum(['adequate', 'low', 'missing']);

export const questionCoPoMappingSchema = z.object({
  questionId: z.string().uuid(),
  questionKey: z.string(),
  moduleNumber: z.number().int().positive(),
  marks: z.number().int().positive(),
  coTag: z.string(),
  poTag: z.string(),
  strengthWeight: strengthWeightSchema,
  rationale: z.string(),
  editedAt: z.string().datetime().nullable().optional(),
  editedBy: z.string().nullable().optional(),
});

export const coCoverageEntrySchema = z.object({
  coTag: z.string(),
  title: z.string(),
  weightedScore: z.number().int().nonnegative(),
  questionCount: z.number().int().nonnegative(),
  coveragePct: z.number().int().min(0).max(100),
  status: coCoverageStatusSchema,
  isUnderRepresented: z.boolean(),
});

export const paperCoPoMappingSchema = z.object({
  paperId: z.string().uuid(),
  institutionId: z.string().uuid(),
  courseCode: z.string(),
  examType: z.string(),
  generatedAt: z.string().datetime(),
  generatedBy: z.string(),
  questions: z.array(questionCoPoMappingSchema),
  coverage: z.array(coCoverageEntrySchema),
  underRepresentedCount: z.number().int().nonnegative(),
  readyForSubmit: z.boolean(),
});

export const updateCoPoMappingBodySchema = z.object({
  coTag: z.string().regex(/^CO[1-5]$/).optional(),
  poTag: z.string().regex(/^PO\d+$/).optional(),
  strengthWeight: strengthWeightSchema.optional(),
});

export type StrengthWeight = z.infer<typeof strengthWeightSchema>;
export type CoCoverageStatus = z.infer<typeof coCoverageStatusSchema>;
export type QuestionCoPoMapping = z.infer<typeof questionCoPoMappingSchema>;
export type CoCoverageEntry = z.infer<typeof coCoverageEntrySchema>;
export type PaperCoPoMapping = z.infer<typeof paperCoPoMappingSchema>;

/** Minimum weighted strength sum for a CO to be considered adequately covered. */
export const CO_ADEQUACY_THRESHOLD = 3;
