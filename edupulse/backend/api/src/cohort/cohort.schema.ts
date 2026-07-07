import { z } from 'zod';

export const cohortCsvRowSchema = z.object({
  usn: z.string().min(3).max(32),
  studentName: z.string().min(1).max(200),
  courseCode: z.string().min(2).max(32),
  section: z.string().min(1).max(16),
  semester: z.string().min(1).max(32),
});

export const importCohortBodySchema = z.object({
  csv: z.string().min(1),
});

export const importSummarySchema = z.object({
  rowsProcessed: z.number().int().nonnegative(),
  studentsCreated: z.number().int().nonnegative(),
  studentsUpdated: z.number().int().nonnegative(),
  coursesCreated: z.number().int().nonnegative(),
  coursesUpdated: z.number().int().nonnegative(),
  enrollmentsCreated: z.number().int().nonnegative(),
  enrollmentsUpdated: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      row: z.number().int().positive(),
      message: z.string(),
    }),
  ),
});

export const rosterStudentSchema = z.object({
  usn: z.string(),
  name: z.string(),
});

export const courseRosterSchema = z.object({
  courseCode: z.string(),
  section: z.string().optional(),
  semester: z.string().optional(),
  students: z.array(rosterStudentSchema),
  total: z.number().int().nonnegative(),
});

export type CohortCsvRow = z.infer<typeof cohortCsvRowSchema>;
export type ImportSummary = z.infer<typeof importSummarySchema>;
export type CourseRoster = z.infer<typeof courseRosterSchema>;

export const COHORT_CSV_TEMPLATE_HEADER =
  'USN,Student Name,Course Code,Section,Semester';
