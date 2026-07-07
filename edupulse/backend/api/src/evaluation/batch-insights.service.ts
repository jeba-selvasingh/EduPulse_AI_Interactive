import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { MasteryHeatmapService } from '../marks/mastery-heatmap.service';
import { MarksService } from '../marks/marks.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { BatchEvaluationInsights, HeatmapRefreshResult } from './batch-insights.schema';
import {
  buildInsightMessage,
  buildQuestionAverages,
  buildScoreDistribution,
  findWeakestQuestion,
  flattenEvaluationCells,
  sheetReviewBucket,
} from './batch-insights.util';
import { CohortService } from '../cohort/cohort.service';
import { EvaluationStoreService } from './evaluation-store.service';

@Injectable()
export class BatchInsightsService {
  constructor(
    private readonly store: EvaluationStoreService,
    private readonly cohort: CohortService,
    private readonly marks: MarksService,
    private readonly heatmap: MasteryHeatmapService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getInsights(user: AuthUser, courseCode: string, examType: string): BatchEvaluationInsights {
    const started = Date.now();
    const roster = this.cohort.getCourseRoster(user, courseCode);
    const evaluations = this.store.listSheetEvaluations(user.institutionId, courseCode, examType);

    let approvedCount = 0;
    let inReviewCount = 0;
    for (const evaluation of evaluations) {
      if (sheetReviewBucket(evaluation) === 'in_review') {
        inReviewCount += 1;
      } else {
        approvedCount += 1;
      }
    }

    const questionAverages = buildQuestionAverages(evaluations);
    const weakestQuestion = findWeakestQuestion(evaluations, questionAverages);
    const insight: BatchEvaluationInsights = {
      courseCode,
      examType,
      totalStudents: roster.students.length,
      evaluatedCount: evaluations.length,
      approvedCount,
      inReviewCount,
      pendingCount: Math.max(roster.students.length - evaluations.length, 0),
      scoreDistribution: buildScoreDistribution(evaluations),
      questionAverages,
      weakestQuestion,
      insightMessage: buildInsightMessage(weakestQuestion, evaluations.length),
    };

    this.actionLogger.logAction({
      action: LogAction.EvaluationBatchInsights,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        evaluatedCount: insight.evaluatedCount,
        weakestQuestionId: weakestQuestion?.questionId ?? null,
        belowThresholdCount: weakestQuestion?.belowThresholdCount ?? 0,
      },
    });

    return insight;
  }

  refreshHeatmap(user: AuthUser, courseCode: string, examType: string): HeatmapRefreshResult {
    const started = Date.now();
    const evaluations = this.store.listSheetEvaluations(user.institutionId, courseCode, examType);
    const cells = flattenEvaluationCells(evaluations);
    const importResult = this.marks.importCells(user, courseCode, examType, cells);
    const heatmap = this.heatmap.getHeatmap(user, courseCode, examType);
    const weakest = findWeakestQuestion(evaluations, buildQuestionAverages(evaluations));

    const result: HeatmapRefreshResult = {
      courseCode,
      examType,
      importedCells: importResult.cellsImported,
      heatmapStudentsWithMarks: heatmap.studentsWithMarks,
      highlightedClusters: heatmap.weakClusters.filter((cluster) => cluster.isHighlighted).length,
      weakestCoTag: weakest?.mappedCoTag ?? null,
      insightMessage: `Synced ${importResult.cellsImported} evaluated marks to Mark Matrix and refreshed the mastery heatmap.`,
    };

    this.actionLogger.logAction({
      action: LogAction.EvaluationHeatmapRefresh,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        importedCells: result.importedCells,
        heatmapStudentsWithMarks: result.heatmapStudentsWithMarks,
        highlightedClusters: result.highlightedClusters,
        weakestCoTag: result.weakestCoTag,
      },
    });

    return result;
  }
}
