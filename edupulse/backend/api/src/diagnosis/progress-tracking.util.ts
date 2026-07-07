import type { ReadinessPoint, ReadinessTrendLabel } from './progress-tracking.schema';

export function computeBarHeights(
  points: Array<Omit<ReadinessPoint, 'barHeightPercent'>>,
): ReadinessPoint[] {
  const maxScore = Math.max(...points.map((point) => point.score), 1);
  return points.map((point) => ({
    ...point,
    barHeightPercent: Math.round((point.score / maxScore) * 100),
  }));
}

export function readinessTrendLabel(points: ReadinessPoint[]): ReadinessTrendLabel {
  if (points.length < 2) return 'stable';
  const first = points[0].score;
  const last = points[points.length - 1].score;
  const delta = last - first;
  if (delta >= 5) return 'improving';
  if (delta <= -5) return 'declining';
  return 'stable';
}
