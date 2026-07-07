import type { RubricMarkStep } from './answer-key.schema';
import { sumRubricMarks } from './answer-key.schema';

type AnswerKeyTemplate = {
  match: RegExp;
  modelAnswer: string;
  steps: Array<{ label: string; weight: number }>;
};

const PILOT_ANSWER_KEY_TEMPLATES: AnswerKeyTemplate[] = [
  {
    match: /circular queue/i,
    modelAnswer:
      'A circular queue is a linear data structure where the last position connects back to the first, using front and rear pointers with modulo arithmetic to reuse freed slots. Enqueue advances rear with (rear+1) % capacity; dequeue advances front similarly. Overflow occurs when the queue is full; underflow when empty.',
    steps: [
      { label: 'Definition of circular queue ADT', weight: 20 },
      { label: 'Neat labelled diagram', weight: 30 },
      { label: 'Enqueue and dequeue logic', weight: 30 },
      { label: 'Overflow and underflow conditions', weight: 20 },
    ],
  },
  {
    match: /insertion sort/i,
    modelAnswer:
      'Insertion sort builds a sorted subarray by inserting each element into its correct position. For each index i from 1 to n-1, shift elements greater than key one position right, then place key. Time complexity is O(n²) average/worst and O(n) best when nearly sorted.',
    steps: [
      { label: 'Algorithm steps with pseudocode', weight: 35 },
      { label: 'Trace on example input', weight: 35 },
      { label: 'Time complexity analysis', weight: 30 },
    ],
  },
  {
    match: /AVL tree/i,
    modelAnswer:
      'An AVL tree is a self-balancing BST where the balance factor of every node lies in {-1,0,1}. Insertions and deletions may trigger single or double rotations (LL, RR, LR, RL) to restore balance while preserving BST ordering.',
    steps: [
      { label: 'AVL balance factor definition', weight: 20 },
      { label: 'Rotation cases illustrated', weight: 40 },
      { label: 'Construction algorithm', weight: 25 },
      { label: 'Complexity discussion', weight: 15 },
    ],
  },
  {
    match: /linked list/i,
    modelAnswer:
      'A singly linked list stores nodes with data and a next pointer. Insert at head is O(1); insert after a node and delete require pointer manipulation while preserving links. Diagrams should show pointer updates clearly.',
    steps: [
      { label: 'Structure diagram', weight: 25 },
      { label: 'Insert operation', weight: 35 },
      { label: 'Delete operation', weight: 25 },
      { label: 'Complexity comparison', weight: 15 },
    ],
  },
  {
    match: /BFS|DFS|graph/i,
    modelAnswer:
      'BFS explores vertices level by level using a queue; DFS explores deeply using a stack/recursion. Both mark visited nodes to avoid cycles. Applications include shortest unweighted paths (BFS) and connectivity/topological ordering (DFS).',
    steps: [
      { label: 'BFS algorithm and trace', weight: 35 },
      { label: 'DFS algorithm and trace', weight: 35 },
      { label: 'Example on graph diagram', weight: 30 },
    ],
  },
];

const GENERIC_TEMPLATE: AnswerKeyTemplate = {
  match: /.*/,
  modelAnswer:
    'Model answer should define key terms, show the required diagram or algorithm, apply the concept to the given scenario, and state assumptions with correct technical terminology aligned to the syllabus.',
  steps: [
    { label: 'Key definitions and setup', weight: 25 },
    { label: 'Core method / diagram', weight: 35 },
    { label: 'Application to the question', weight: 25 },
    { label: 'Conclusion and edge cases', weight: 15 },
  ],
};

export function buildPilotAnswerKeyContent(
  questionText: string,
  maxMarks: number,
): { modelAnswer: string; rubricSteps: RubricMarkStep[] } {
  const template =
    PILOT_ANSWER_KEY_TEMPLATES.find((entry) => entry.match.test(questionText)) ??
    GENERIC_TEMPLATE;

  const rubricSteps = allocateRubricMarks(maxMarks, template.steps);
  return {
    modelAnswer: template.modelAnswer,
    rubricSteps,
  };
}

function allocateRubricMarks(
  maxMarks: number,
  weightedSteps: Array<{ label: string; weight: number }>,
): RubricMarkStep[] {
  const totalWeight = weightedSteps.reduce((sum, step) => sum + step.weight, 0);
  const steps: RubricMarkStep[] = weightedSteps.map((step) => ({
    label: step.label,
    marks: Math.max(1, Math.floor((maxMarks * step.weight) / totalWeight)),
  }));

  let diff = maxMarks - sumRubricMarks(steps);
  let index = 0;
  while (diff !== 0 && steps.length > 0) {
    const step = steps[index % steps.length]!;
    if (diff > 0) {
      step.marks += 1;
      diff -= 1;
    } else if (step.marks > 1) {
      step.marks -= 1;
      diff += 1;
    }
    index += 1;
    if (index > 100) break;
  }

  return steps;
}
