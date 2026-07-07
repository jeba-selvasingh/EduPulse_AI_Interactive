import type { CompetencyTrend, NepCompetency } from './academic-level.schema';

export function percentToBloomLevel(percent: number): number {
  if (percent >= 90) return 6;
  if (percent >= 80) return 5;
  if (percent >= 70) return 4;
  if (percent >= 60) return 3;
  if (percent >= 50) return 2;
  return 1;
}

export function competencyFromBloom(level: number): NepCompetency {
  if (level <= 2) return 'Foundational';
  if (level === 3) return 'Developing';
  if (level <= 5) return 'Proficient';
  return 'Advanced';
}

export function trendArrow(trend: CompetencyTrend): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

export function buildSubjectDiagnosisRoute(courseCode: string, usn: string): string {
  const params = new URLSearchParams({ usn, courseCode });
  return `/student-diagnosis?${params.toString()}`;
}

export function bloomSummary(level: number, courseName: string): string {
  if (level >= 4) {
    return `Operates up to Bloom L${level} · strong in ${courseName.toLowerCase()} fundamentals`;
  }
  if (level === 3) {
    return `Recall fine, struggles at L3 · needs applied practice`;
  }
  return `Foundational recall · build toward Bloom L3`;
}
