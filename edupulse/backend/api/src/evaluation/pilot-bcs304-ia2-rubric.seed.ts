import { buildPilotAnswerKeyContent } from '../paper-craft/pilot-bcs304-answer-keys.seed';
import type { RubricMarkStep } from '../paper-craft/answer-key.schema';

export type PilotRubricQuestion = {
  questionId: string;
  questionKey: string;
  maxMarks: number;
  topic: string;
  modelAnswer: string;
  rubricSteps: RubricMarkStep[];
};

const PILOT_IA2_TOPICS = [
  { id: 'Q1', key: 'Q1', topic: 'Explain circular queue insertion and deletion with a diagram.' },
  { id: 'Q2', key: 'Q2', topic: 'Describe insertion sort with complexity analysis and trace.' },
  { id: 'Q3', key: 'Q3', topic: 'Explain AVL tree rotations with construction steps.' },
];

export function getPilotBcs304Ia2Rubric(): PilotRubricQuestion[] {
  return PILOT_IA2_TOPICS.map((entry) => {
    const { modelAnswer, rubricSteps } = buildPilotAnswerKeyContent(entry.topic, 10);
    return {
      questionId: entry.id,
      questionKey: entry.key,
      maxMarks: 10,
      topic: entry.topic,
      modelAnswer,
      rubricSteps,
    };
  });
}
