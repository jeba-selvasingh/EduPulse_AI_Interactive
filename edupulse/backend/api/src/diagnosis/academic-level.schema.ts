import { z } from 'zod';

export const nepCompetencySchema = z.enum(['Foundational', 'Developing', 'Proficient', 'Advanced']);
export type NepCompetency = z.infer<typeof nepCompetencySchema>;

export const competencyTrendSchema = z.enum(['up', 'stable', 'down']);
export type CompetencyTrend = z.infer<typeof competencyTrendSchema>;

export const academicSubjectSchema = z.object({
  courseCode: z.string(),
  courseName: z.string(),
  competency: nepCompetencySchema,
  highestBloomLevel: z.number().int().min(1).max(6),
  trend: competencyTrendSchema,
  trendWarning: z.boolean(),
  summary: z.string(),
  hasPublishedMarks: z.boolean(),
  diagnosisRoute: z.string(),
});

export type AcademicSubject = z.infer<typeof academicSubjectSchema>;

export const academicLevelViewSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  subjects: z.array(academicSubjectSchema),
  ladderCaption: z.string(),
});

export type AcademicLevelView = z.infer<typeof academicLevelViewSchema>;
