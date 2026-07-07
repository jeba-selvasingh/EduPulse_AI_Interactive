import { z } from 'zod';

export const conceptMasteryBandSchema = z.enum(['green', 'amber', 'red', 'missing']);
export type ConceptMasteryBand = z.infer<typeof conceptMasteryBandSchema>;

export const bloomLevelStatusSchema = z.enum(['pass', 'fail', 'untested']);
export type BloomLevelStatus = z.infer<typeof bloomLevelStatusSchema>;

export const conceptMasterySchema = z.object({
  conceptId: z.string(),
  name: z.string(),
  masteryPercent: z.number().int().min(0).max(100).nullable(),
  isWeak: z.boolean(),
  band: conceptMasteryBandSchema,
  bloomLevel: z.number().int().min(1).max(6).optional(),
  evidence: z.string().optional(),
});

export type ConceptMastery = z.infer<typeof conceptMasterySchema>;

export const bloomStripLevelSchema = z.object({
  level: z.number().int().min(1).max(6),
  status: bloomLevelStatusSchema,
});

export const bloomStripSchema = z.object({
  levels: z.array(bloomStripLevelSchema),
  caption: z.string(),
});

export const aiDiagnosisSchema = z.object({
  summary: z.string(),
  evidenceRefs: z.array(z.string()),
  trustCardId: z.string().optional(),
});

export const conceptDiagnosisMapSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  examType: z.string(),
  focusCoTag: z.string().optional(),
  concepts: z.array(conceptMasterySchema),
  bloomStrip: bloomStripSchema,
  aiDiagnosis: aiDiagnosisSchema,
  examEvidenceRoute: z.string(),
});

export type ConceptDiagnosisMap = z.infer<typeof conceptDiagnosisMapSchema>;
