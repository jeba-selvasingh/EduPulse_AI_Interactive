import { PILOT_BCS304_COURSE_OUTCOMES } from '../paper-craft/pilot-bcs304-course-outcomes.seed';

export type CoQuestionContributor = {
  questionId: string;
  weight: number;
};

export type AssessmentCoMapping = {
  coTag: string;
  title: string;
  contributors: CoQuestionContributor[];
};

/** IA-2 question → CO mapping for BCS304 mastery heatmap (CO1–CO5). */
export const PILOT_BCS304_IA2_CO_MAPPING: AssessmentCoMapping[] = [
  {
    coTag: 'CO1',
    title: PILOT_BCS304_COURSE_OUTCOMES.find((co) => co.coTag === 'CO1')!.title,
    contributors: [{ questionId: 'Q1', weight: 1 }],
  },
  {
    coTag: 'CO2',
    title: PILOT_BCS304_COURSE_OUTCOMES.find((co) => co.coTag === 'CO2')!.title,
    contributors: [{ questionId: 'Q2', weight: 1 }],
  },
  {
    coTag: 'CO3',
    title: PILOT_BCS304_COURSE_OUTCOMES.find((co) => co.coTag === 'CO3')!.title,
    contributors: [{ questionId: 'Q3', weight: 1 }],
  },
  {
    coTag: 'CO4',
    title: PILOT_BCS304_COURSE_OUTCOMES.find((co) => co.coTag === 'CO4')!.title,
    contributors: [{ questionId: 'Q3', weight: 1 }],
  },
  {
    coTag: 'CO5',
    title: PILOT_BCS304_COURSE_OUTCOMES.find((co) => co.coTag === 'CO5')!.title,
    contributors: [
      { questionId: 'Q1', weight: 1 / 3 },
      { questionId: 'Q2', weight: 1 / 3 },
      { questionId: 'Q3', weight: 1 / 3 },
    ],
  },
];
