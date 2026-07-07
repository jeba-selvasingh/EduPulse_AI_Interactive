import { z } from 'zod';

export const PILOT_ACADEMIC_TERM = 'Odd Sem 2026';

export const syllabusVersionStatusSchema = z.enum(['active', 'superseded', 'pending']);

export const syllabusRecordSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  courseCode: z.string(),
  academicTerm: z.string(),
  fileName: z.string(),
  storageKey: z.string(),
  mimeType: z.literal('application/pdf'),
  sizeBytes: z.number().int().positive(),
  uploadedBy: z.string(),
  uploadedAt: z.string().datetime(),
  version: z.number().int().positive(),
  status: syllabusVersionStatusSchema,
  activatedAt: z.string().datetime().nullable(),
  supersededAt: z.string().datetime().nullable(),
});

export const uploadSyllabusBodySchema = z.object({
  fileName: z.string().min(1).max(255),
  base64: z.string().min(1),
  academicTerm: z.string().min(1).max(100).optional(),
});

export const syllabusUploadResultSchema = z.object({
  record: syllabusRecordSchema,
  requiresActivation: z.boolean(),
});

export const activateVersionResultSchema = z.object({
  activated: syllabusRecordSchema,
  superseded: syllabusRecordSchema.nullable(),
});

export const syllabusGenerationWarningSchema = z.object({
  code: z.literal('SUPERSEDED_SYLLABUS'),
  message: z.string(),
  syllabusVersionId: z.string().uuid(),
  activeVersionId: z.string().uuid(),
  activeVersion: z.number().int().positive(),
  supersededVersion: z.number().int().positive(),
});

export const syllabusModuleSchema = z.object({
  id: z.string().uuid(),
  syllabusId: z.string().uuid(),
  moduleNumber: z.number().int().positive(),
  title: z.string().min(1).max(200),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
});

export const syllabusModuleInputSchema = z.object({
  moduleNumber: z.number().int().positive(),
  title: z.string().min(1).max(200),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
});

export const upsertModulesBodySchema = z.object({
  modules: z.array(syllabusModuleInputSchema).min(1),
});

export type SyllabusVersionStatus = z.infer<typeof syllabusVersionStatusSchema>;
export type SyllabusRecord = z.infer<typeof syllabusRecordSchema>;
export type SyllabusUploadResult = z.infer<typeof syllabusUploadResultSchema>;
export type ActivateVersionResult = z.infer<typeof activateVersionResultSchema>;
export type SyllabusGenerationWarning = z.infer<typeof syllabusGenerationWarningSchema>;
export type SyllabusModule = z.infer<typeof syllabusModuleSchema>;
export type SyllabusModuleInput = z.infer<typeof syllabusModuleInputSchema>;
