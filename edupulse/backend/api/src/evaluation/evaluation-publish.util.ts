import type { SheetEvaluation } from './ai-evaluation.schema';
import type { PendingReviewItem } from './evaluation-publish.schema';

export function listPendingFlaggedReviews(evaluations: SheetEvaluation[]): PendingReviewItem[] {
  const pending: PendingReviewItem[] = [];

  for (const evaluation of evaluations) {
    for (const question of evaluation.questions) {
      if (question.flaggedForReview && question.reviewStatus === 'pending') {
        pending.push({
          usn: evaluation.usn,
          studentName: evaluation.studentName,
          questionId: question.questionId,
          questionKey: question.questionKey,
        });
      }
    }
  }

  return pending.sort((a, b) => {
    const usnCompare = a.usn.localeCompare(b.usn);
    if (usnCompare !== 0) return usnCompare;
    return a.questionKey.localeCompare(b.questionKey);
  });
}

export function flattenEvaluationMarks(
  evaluations: SheetEvaluation[],
): Array<{ usn: string; questionId: string; marks: number }> {
  const cells: Array<{ usn: string; questionId: string; marks: number }> = [];
  for (const evaluation of evaluations) {
    for (const question of evaluation.questions) {
      cells.push({
        usn: evaluation.usn,
        questionId: question.questionId,
        marks: question.marksAwarded,
      });
    }
  }
  return cells;
}
