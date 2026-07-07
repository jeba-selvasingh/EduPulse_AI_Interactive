import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { PaperCraftStoreService } from '../paper-craft/paper-craft-store.service';
import { PaperModerationService } from '../paper-craft/paper-moderation.service';
import type { EvaluationWorkflowDashboard } from './evaluation-workflow.schema';
import { EvaluationStoreService } from './evaluation-store.service';

@Injectable()
export class EvaluationWorkflowService {
  constructor(
    private readonly store: EvaluationStoreService,
    private readonly cohort: CohortService,
    private readonly moderation: PaperModerationService,
    private readonly papers: PaperCraftStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getDashboard(
    user: AuthUser,
    courseCode: string,
    examType: string,
    paperId?: string,
  ): EvaluationWorkflowDashboard {
    const started = Date.now();
    const roster = this.cohort.getCourseRoster(user, courseCode);
    const totalStudents = roster.total;

    let available = true;
    let message = 'Answer Sheet AI workflow ready';
    let moderationStatus: EvaluationWorkflowDashboard['moderationStatus'];
    let resolvedPaperId: string | null = paperId ?? null;

    if (paperId) {
      const access = this.moderation.getEvaluationAccess(user, paperId);
      available = access.unlocked;
      message = access.message;
      moderationStatus = access.moderationStatus;
      resolvedPaperId = access.paperId;
    }

    const progress = available
      ? this.store.ensurePilotSeed(user.institutionId, courseCode, examType)
      : { uploaded: 0, aiEvaluated: 0, facultyReviewed: 0 };

    const percentComplete = this.toPercent(progress, totalStudents);

    const paper = resolvedPaperId ? this.papers.getById(resolvedPaperId) : undefined;

    const dashboard: EvaluationWorkflowDashboard = {
      courseCode,
      examType,
      paperId: resolvedPaperId,
      available,
      moderationStatus,
      message,
      totalStudents,
      questionCount: paper?.questionCount,
      totalMarks: paper?.totalMarks,
      progress,
      percentComplete,
    };

    this.actionLogger.logAction({
      action: LogAction.EvaluationDashboardView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        paperId: resolvedPaperId,
        available,
        uploaded: progress.uploaded,
        aiEvaluated: progress.aiEvaluated,
        facultyReviewed: progress.facultyReviewed,
        totalStudents,
      },
    });

    return dashboard;
  }

  private toPercent(progress: EvaluationWorkflowDashboard['progress'], total: number) {
    const denom = Math.max(total, 1);
    return {
      uploaded: Math.round((progress.uploaded / denom) * 100),
      aiEvaluated: Math.round((progress.aiEvaluated / denom) * 100),
      facultyReviewed: Math.round((progress.facultyReviewed / denom) * 100),
    };
  }
}
