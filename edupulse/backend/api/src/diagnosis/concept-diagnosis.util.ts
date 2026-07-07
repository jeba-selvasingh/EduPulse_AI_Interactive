import type { ConceptMasteryBand, BloomLevelStatus } from './concept-diagnosis.schema';

export const WEAK_MASTERY_THRESHOLD = 40;

export function bandForMastery(percent: number | null): ConceptMasteryBand {
  if (percent === null) return 'missing';
  if (percent >= 70) return 'green';
  if (percent >= WEAK_MASTERY_THRESHOLD) return 'amber';
  return 'red';
}

export function isWeakMastery(percent: number | null): boolean {
  return percent !== null && percent < WEAK_MASTERY_THRESHOLD;
}

export function buildBloomStripCaption(
  levels: Array<{ level: number; status: BloomLevelStatus }>,
): string {
  const parts = levels.map((entry) => {
    if (entry.status === 'pass') return `L${entry.level} ✓`;
    if (entry.status === 'fail') return `L${entry.level} fails`;
    return null;
  });

  const tested = parts.filter((part): part is string => part !== null);
  const untestedStart = levels.find((entry) => entry.status === 'untested')?.level;
  const untestedSuffix =
    untestedStart !== undefined ? ` · L${untestedStart}–L6 untested` : '';

  return `${tested.join(' ')}${untestedSuffix}`.trim();
}

export function buildExamEvidenceRoute(
  courseCode: string,
  examType: string,
  usn: string,
): string {
  const params = new URLSearchParams({ usn, courseCode, examType });
  return `/exam-evidence?${params.toString()}`;
}
