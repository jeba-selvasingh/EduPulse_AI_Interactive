import type { ImprovementArea, ImprovementPriority } from './improvement-plan.schema';

export function priorityLabel(priority: ImprovementPriority): string {
  switch (priority) {
    case 'high':
      return 'High priority';
    case 'medium':
      return 'Medium';
    default:
      return 'Watch';
  }
}

export function buildEightWeekPlanRoute(usn: string, courseCode?: string): string {
  const params = new URLSearchParams({ usn });
  if (courseCode) params.set('courseCode', courseCode);
  return `/improvement-plan?${params.toString()}`;
}

export function buildProgressRoute(usn: string): string {
  const params = new URLSearchParams({ usn });
  return `/progress-tracking?${params.toString()}`;
}

export function rankAreas(
  areas: Omit<ImprovementArea, 'rank' | 'isFocused' | 'facultyAttribution'>[],
  focusItemId?: string,
): ImprovementArea[] {
  const boosted = areas.map((area) => ({
    ...area,
    impactScore:
      focusItemId && area.itemId === focusItemId ? area.impactScore + 50 : area.impactScore,
  }));

  const sorted = [...boosted].sort((left, right) => right.impactScore - left.impactScore);

  return sorted.map((area, index) => ({
    ...area,
    rank: index + 1,
    isFocused: focusItemId === area.itemId,
  }));
}
