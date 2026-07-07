import type { StrengthWeight } from './co-po-mapping.schema';

export type CourseOutcomeDefinition = {
  coTag: string;
  title: string;
};

/** BCS304 Data Structures — pilot CO catalog (CO1–CO5). */
export const PILOT_BCS304_COURSE_OUTCOMES: CourseOutcomeDefinition[] = [
  { coTag: 'CO1', title: 'Apply linear data structures and ADTs' },
  { coTag: 'CO2', title: 'Analyze sorting and linked-list algorithms' },
  { coTag: 'CO3', title: 'Design tree-based solutions with rotations' },
  { coTag: 'CO4', title: 'Evaluate graph algorithms and complexity' },
  { coTag: 'CO5', title: 'Implement efficient data-structure programs' },
];

const RATIONALE_BY_MODULE: Record<number, string> = {
  1: 'Tests conceptual understanding of ADTs, directly supporting linear structure outcomes.',
  2: 'Algorithm construction and analysis task mapping to sorting and list operations.',
  3: 'Program construction task mapping to tree design and balanced BST solutions.',
  4: 'Graph traversal and shortest-path application supporting advanced outcome coverage.',
};

export function rationaleForModule(moduleNumber: number): string {
  return (
    RATIONALE_BY_MODULE[moduleNumber] ??
    'Assesses syllabus module concepts with explicit course-outcome alignment.'
  );
}

export function defaultStrengthForBloom(bloomLevel: number): StrengthWeight {
  if (bloomLevel >= 4) return 3;
  if (bloomLevel >= 2) return 2;
  return 1;
}
