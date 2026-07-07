import { PILOT_BCS304_IA2_CO_MAPPING } from '../marks/pilot-bcs304-ia2-co-mapping.seed';
import type { SheetEvaluation } from './ai-evaluation.schema';
import {
  QUESTION_WEAK_THRESHOLD_RATIO,
  SCORE_BANDS,
  type BatchEvaluationInsights,
  type QuestionAverage,
  type WeakestQuestionInsight,
} from './batch-insights.schema';
import { getPilotBcs304Ia2Rubric } from './pilot-bcs304-ia2-rubric.seed';

function topicByQuestionId(): Map<string, { questionKey: string; topic: string; maxMarks: number }> {
  return new Map(
    getPilotBcs304Ia2Rubric().map((entry) => [
      entry.questionId,
      { questionKey: entry.questionKey, topic: entry.topic, maxMarks: entry.maxMarks },
    ]),
  );
}

function coTagForQuestion(questionId: string): string | null {
  const primary = PILOT_BCS304_IA2_CO_MAPPING.find((mapping) =>
    mapping.contributors.some(
      (contributor) => contributor.questionId === questionId && contributor.weight >= 1,
    ),
  );
  if (primary) return primary.coTag;

  const shared = PILOT_BCS304_IA2_CO_MAPPING.find((mapping) =>
    mapping.contributors.some((contributor) => contributor.questionId === questionId),
  );
  return shared?.coTag ?? null;
}

export function sheetReviewBucket(evaluation: SheetEvaluation): 'approved' | 'in_review' {
  const flaggedPending = evaluation.questions.some(
    (question) => question.flaggedForReview && question.reviewStatus === 'pending',
  );
  return flaggedPending ? 'in_review' : 'approved';
}

export function buildScoreDistribution(
  evaluations: SheetEvaluation[],
): BatchEvaluationInsights['scoreDistribution'] {
  const counts = new Map(SCORE_BANDS.map((band) => [band.band, 0]));

  for (const evaluation of evaluations) {
    const percent =
      evaluation.maxTotalMarks > 0
        ? (evaluation.totalMarks / evaluation.maxTotalMarks) * 100
        : 0;
    const bucket =
      SCORE_BANDS.find(
        (band) => percent >= band.minPercent && percent <= band.maxPercent,
      ) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
    counts.set(bucket.band, (counts.get(bucket.band) ?? 0) + 1);
  }

  const total = evaluations.length || 1;
  return SCORE_BANDS.map((band) => ({
    band: band.band,
    label: band.label,
    count: counts.get(band.band) ?? 0,
    percent: Math.round(((counts.get(band.band) ?? 0) / total) * 100),
  }));
}

export function buildQuestionAverages(evaluations: SheetEvaluation[]): QuestionAverage[] {
  const topics = topicByQuestionId();
  const totals = new Map<string, { sum: number; count: number }>();

  for (const evaluation of evaluations) {
    for (const question of evaluation.questions) {
      const current = totals.get(question.questionId) ?? { sum: 0, count: 0 };
      totals.set(question.questionId, {
        sum: current.sum + question.marksAwarded,
        count: current.count + 1,
      });
    }
  }

  return [...totals.entries()]
    .map(([questionId, stats]) => {
      const meta = topics.get(questionId);
      const maxMarks = meta?.maxMarks ?? 10;
      const averageMarks = Math.round((stats.sum / stats.count) * 10) / 10;
      return {
        questionId,
        questionKey: meta?.questionKey ?? questionId,
        topic: meta?.topic ?? questionId,
        averageMarks,
        maxMarks,
        averagePercent: Math.round((averageMarks / maxMarks) * 100),
      };
    })
    .sort((a, b) => a.questionKey.localeCompare(b.questionKey));
}

export function findWeakestQuestion(
  evaluations: SheetEvaluation[],
  questionAverages: QuestionAverage[],
): WeakestQuestionInsight | null {
  if (questionAverages.length === 0) return null;

  const weakest = [...questionAverages].sort((a, b) => a.averageMarks - b.averageMarks)[0];
  const thresholdMarks = weakest.maxMarks * QUESTION_WEAK_THRESHOLD_RATIO;

  let belowThresholdCount = 0;
  for (const evaluation of evaluations) {
    const question = evaluation.questions.find((entry) => entry.questionId === weakest.questionId);
    if (question && question.marksAwarded < thresholdMarks) {
      belowThresholdCount += 1;
    }
  }

  return {
    questionId: weakest.questionId,
    questionKey: weakest.questionKey,
    topic: weakest.topic,
    averageMarks: weakest.averageMarks,
    maxMarks: weakest.maxMarks,
    thresholdMarks,
    belowThresholdCount,
    mappedCoTag: coTagForQuestion(weakest.questionId),
  };
}

export function buildInsightMessage(
  weakest: WeakestQuestionInsight | null,
  evaluatedCount: number,
): string {
  if (evaluatedCount === 0) {
    return 'Run AI evaluation on uploaded sheets to unlock batch insights.';
  }
  if (!weakest) {
    return 'Batch evaluation is complete. Review per-question averages above.';
  }

  const coHint = weakest.mappedCoTag
    ? ` This maps to ${weakest.mappedCoTag} weakness in the mastery heatmap.`
    : '';
  return `${weakest.questionKey} has the lowest class average (${weakest.averageMarks}/${weakest.maxMarks}) — ${weakest.belowThresholdCount} students scored below ${weakest.thresholdMarks}.${coHint}`;
}

export function flattenEvaluationCells(
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
