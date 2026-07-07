import { WEAK_MASTERY_THRESHOLD } from './concept-diagnosis.util';

export function isWeakQuestion(marksAwarded: number, maxMarks: number): boolean {
  if (maxMarks <= 0) return false;
  return (marksAwarded / maxMarks) * 100 < WEAK_MASTERY_THRESHOLD;
}

export function buildImprovementAreaRoute(
  courseCode: string,
  examType: string,
  usn: string,
  questionId: string,
): string {
  const params = new URLSearchParams({ usn, courseCode, examType, questionId });
  return `/improvement-areas?${params.toString()}`;
}

export function buildImprovementPlanRoute(
  courseCode: string,
  usn: string,
): string {
  const params = new URLSearchParams({ usn, courseCode });
  return `/improvement-areas?${params.toString()}`;
}

export function roundAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

export function feedbackFromPercent(
  questionKey: string,
  topic: string,
  marksAwarded: number,
  maxMarks: number,
  facultyNote?: string | null,
  rationale?: string,
): string {
  if (facultyNote) return facultyNote;
  if (rationale) {
    const short = rationale.split('. ')[0];
    if (short.length <= 120) return short;
  }

  const percent = maxMarks > 0 ? (marksAwarded / maxMarks) * 100 : 0;
  if (questionKey === 'Q2' && percent < 50) {
    return 'Decomposition incorrect — rubric steps 3–5 missed';
  }
  if (questionKey === 'Q1' && percent >= 70) {
    return 'Lost marks: cardinality notation missing on two relations';
  }
  if (questionKey === 'Q3' && percent >= 60) {
    return 'Correct logic, syntax slip in outer join clause';
  }
  if (percent < 40) {
    return `${topic} — key rubric steps missed on ${questionKey}`;
  }
  return `Solid attempt on ${topic.toLowerCase()} with minor gaps`;
}
