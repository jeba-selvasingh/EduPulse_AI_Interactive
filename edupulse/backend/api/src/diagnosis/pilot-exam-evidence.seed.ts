import type { ExamQuestionEvidence, ExamEvidenceView } from './exam-evidence.schema';

export type PilotExamQuestionSeed = {
  questionId: string;
  label: string;
  topic: string;
  bloomLevel: number;
  marksAwarded: number;
  maxMarks: number;
  classAverageMarks: number;
  rubricFeedback: string;
};

export const PILOT_BCS301_EXAM_EVIDENCE: Omit<ExamEvidenceView, 'usn' | 'studentName'> = {
  courseCode: 'BCS301',
  courseName: 'DBMS',
  examType: 'IA-2',
  isPublished: true,
  totalMarks: 18,
  maxTotalMarks: 30,
  questions: [
    {
      questionId: 'Q1',
      label: 'Q1 · ER diagram · L2',
      topic: 'ER diagram',
      bloomLevel: 2,
      marksAwarded: 8,
      maxMarks: 10,
      classAverageMarks: 7.2,
      rubricFeedback: 'Lost 2 m: cardinality notation missing on two relations',
      isWeak: false,
      improvementRoute: '',
    },
    {
      questionId: 'Q2',
      label: 'Q2 · Normalize to 3NF · L3',
      topic: 'Normalize to 3NF',
      bloomLevel: 3,
      marksAwarded: 3,
      maxMarks: 10,
      classAverageMarks: 6.2,
      rubricFeedback: 'Decomposition incorrect — rubric steps 3–5 missed',
      isWeak: true,
      improvementRoute: '',
    },
    {
      questionId: 'Q3',
      label: 'Q3 · SQL joins · L3',
      topic: 'SQL joins',
      bloomLevel: 3,
      marksAwarded: 7,
      maxMarks: 10,
      classAverageMarks: 6.8,
      rubricFeedback: 'Correct logic, syntax slip in outer join clause',
      isWeak: false,
      improvementRoute: '',
    },
  ],
  summary: {
    classAverageTotal: 21,
    studentTotal: 18,
    maxTotalMarks: 30,
    deltaFromClassAverage: -3,
    insight:
      'Class average 21/30 · Chetan is 3 below · single largest loss is normalization — recoverable with targeted practice.',
  },
  improvementPlanRoute: '',
};

export function attachImprovementRoutes(
  view: Omit<ExamEvidenceView, 'usn' | 'studentName'>,
  usn: string,
  buildRoute: (courseCode: string, examType: string, usn: string, questionId: string) => string,
  buildPlanRoute: (courseCode: string, usn: string) => string,
): Omit<ExamEvidenceView, 'usn' | 'studentName'> {
  return {
    ...view,
    questions: view.questions.map((question) => ({
      ...question,
      improvementRoute: question.isWeak
        ? buildRoute(view.courseCode, view.examType, usn, question.questionId)
        : '',
    })),
    improvementPlanRoute: buildPlanRoute(view.courseCode, usn),
  };
}
