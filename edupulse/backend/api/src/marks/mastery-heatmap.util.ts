import type { MasteryBand } from './mastery-heatmap.schema';
import type { AssessmentCoMapping } from './pilot-bcs304-ia2-co-mapping.seed';

export function computeCoMastery(
  contributors: Array<{ questionId: string; weight: number }>,
  marksByQuestion: Map<string, number>,
  questionMax: Map<string, number>,
): number | null {
  let earned = 0;
  let weightTotal = 0;

  for (const contributor of contributors) {
    const marks = marksByQuestion.get(contributor.questionId);
    const max = questionMax.get(contributor.questionId);
    if (marks === undefined || max === undefined || max <= 0) continue;

    earned += (marks / max) * contributor.weight;
    weightTotal += contributor.weight;
  }

  if (weightTotal === 0) return null;
  return Math.round((earned / weightTotal) * 100);
}

export function bandForPercent(percent: number | null): MasteryBand {
  if (percent === null) return 'missing';
  if (percent >= 70) return 'green';
  if (percent >= 40) return 'amber';
  return 'red';
}

export function buildDiagnosisRoute(courseCode: string, coTag: string, usn: string): string {
  const params = new URLSearchParams({
    usn,
    coTag,
    courseCode,
  });
  return `/student-diagnosis?${params.toString()}`;
}

export function findCoMapping(coMappings: AssessmentCoMapping[], coTag: string) {
  return coMappings.find((mapping) => mapping.coTag === coTag);
}
