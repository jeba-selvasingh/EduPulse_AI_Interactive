import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { MarksStoreService } from '../marks/marks-store.service';
import { MarksService } from '../marks/marks.service';
import type { PublishMarksResult, PublishStatus } from './evaluation-publish.schema';
import { flattenEvaluationMarks, listPendingFlaggedReviews } from './evaluation-publish.util';
import { EvaluationStoreService } from './evaluation-store.service';

@Injectable()
export class EvaluationPublishService {
  constructor(
    private readonly store: EvaluationStoreService,
    private readonly marks: MarksService,
    private readonly marksStore: MarksStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getPublishStatus(user: AuthUser, courseCode: string, examType: string): PublishStatus {
    const evaluations = this.store.listSheetEvaluations(user.institutionId, courseCode, examType);
    const pendingReviews = listPendingFlaggedReviews(evaluations);
    const publishRecord = this.marksStore.getPublishRecord(user.institutionId, courseCode, examType);

    const canPublish = evaluations.length > 0 && pendingReviews.length === 0 && !publishRecord;
    let message = 'Ready to publish evaluated marks to Mark Matrix.';
    if (publishRecord) {
      message = 'Marks are already published and read-only in Mark Matrix.';
    } else if (evaluations.length === 0) {
      message = 'Run AI evaluation on at least one sheet before publishing.';
    } else if (pendingReviews.length > 0) {
      message = `${pendingReviews.length} flagged question(s) still need review or waiver.`;
    }

    return {
      courseCode,
      examType,
      evaluatedCount: evaluations.length,
      canPublish,
      isPublished: Boolean(publishRecord),
      publishedAt: publishRecord?.publishedAt ?? null,
      publishedBy: publishRecord?.publishedBy ?? null,
      source: publishRecord?.source ?? null,
      pendingReviews,
      message,
    };
  }

  publish(user: AuthUser, courseCode: string, examType: string): PublishMarksResult {
    const started = Date.now();
    const status = this.getPublishStatus(user, courseCode, examType);

    if (status.isPublished) {
      throw new BadRequestException({
        code: 'MARKS_ALREADY_PUBLISHED',
        message: 'Marks for this assessment are already published',
      });
    }

    if (status.evaluatedCount === 0) {
      throw new BadRequestException({
        code: 'NO_EVALUATED_SHEETS',
        message: 'No AI-evaluated sheets available to publish',
      });
    }

    if (status.pendingReviews.length > 0) {
      throw new BadRequestException({
        code: 'PENDING_REVIEWS_BLOCK_PUBLISH',
        message: 'Resolve or waive all flagged reviews before publishing',
        pendingReviews: status.pendingReviews,
      });
    }

    const evaluations = this.store.listSheetEvaluations(user.institutionId, courseCode, examType);
    const cells = flattenEvaluationMarks(evaluations);
    const importResult = this.marks.importCells(user, courseCode, examType, cells);
    const batchId = `pub-${randomUUID()}`;
    const publishedAt = new Date().toISOString();

    this.marksStore.markPublished(user.institutionId, courseCode, examType, {
      batchId,
      publishedAt,
      publishedBy: user.sub,
      source: 'evaluation_ai',
      recordCount: importResult.cellsImported,
      publishedStudents: evaluations.length,
    });

    const result: PublishMarksResult = {
      status: 'published',
      batchId,
      courseCode,
      examType,
      importedCells: importResult.cellsImported,
      publishedStudents: evaluations.length,
      publishedAt,
      source: 'evaluation_ai',
      message: `Published ${evaluations.length} evaluated sheets (${importResult.cellsImported} marks) to Mark Matrix.`,
    };

    this.actionLogger.logAction({
      action: LogAction.MarksPublish,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        batchId,
        recordCount: result.importedCells,
        publishedStudents: result.publishedStudents,
        source: result.source,
      },
    });

    return result;
  }
}
