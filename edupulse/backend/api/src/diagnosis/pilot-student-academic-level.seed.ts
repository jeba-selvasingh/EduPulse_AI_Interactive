import type { CompetencyTrend, NepCompetency } from './academic-level.schema';

export const DEV_STUDENT_EMAIL = 'student@pes.edu';
export const PILOT_STUDENT_USN = 'PES1UG23CS003';
export const PILOT_STUDENT_NAME = 'Chetan R';

export type PilotAcademicSubjectSeed = {
  courseCode: string;
  courseName: string;
  competency: NepCompetency;
  highestBloomLevel: number;
  trend: CompetencyTrend;
  summary: string;
  publishedExamType?: string;
};

export const PILOT_ACADEMIC_SUBJECTS: PilotAcademicSubjectSeed[] = [
  {
    courseCode: 'BCS304',
    courseName: 'Data Structures',
    competency: 'Proficient',
    highestBloomLevel: 4,
    trend: 'up',
    summary: 'Operates up to Bloom L4 · strong in linear structures',
    publishedExamType: 'IA-2',
  },
  {
    courseCode: 'BCS301',
    courseName: 'DBMS',
    competency: 'Developing',
    highestBloomLevel: 3,
    trend: 'stable',
    summary: 'Recall fine, struggles at L3 · normalization weak',
  },
  {
    courseCode: 'BCS302',
    courseName: 'Operating Systems',
    competency: 'Proficient',
    highestBloomLevel: 4,
    trend: 'stable',
    summary: 'Consistent L1–L4 · scheduling concepts solid',
  },
  {
    courseCode: 'BCS303',
    courseName: 'Computer Networks',
    competency: 'Foundational',
    highestBloomLevel: 2,
    trend: 'down',
    summary: 'Declining trend since IA-1 · needs intervention',
  },
];
