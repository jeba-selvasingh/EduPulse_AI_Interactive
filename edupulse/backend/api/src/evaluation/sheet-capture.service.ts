import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { PaperModerationService } from '../paper-craft/paper-moderation.service';
import { EvaluationStoreService } from './evaluation-store.service';
import {
  analyzeCaptureBodySchema,
  confirmCaptureBodySchema,
  type SheetCaptureAnalyze,
  type SheetCaptureConfirm,
} from './sheet-capture.schema';
import {
  CORNER_REPOSITION_WARNING,
  detectSheetCorners,
  extractUsnFromHeader,
} from './sheet-capture.util';

type PendingCapture = {
  id: string;
  institutionId: string;
  courseCode: string;
  examType: string;
  cornersDetected: boolean;
  detectedUsn: string | null;
};

@Injectable()
export class SheetCaptureService {
  private readonly pending = new Map<string, PendingCapture>();

  constructor(
    private readonly store: EvaluationStoreService,
    private readonly cohort: CohortService,
    private readonly moderation: PaperModerationService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  analyzeCapture(
    user: AuthUser,
    courseCode: string,
    examType: string,
    body: unknown,
    paperId?: string,
  ): SheetCaptureAnalyze {
    const started = Date.now();
    this.assertWorkflowAvailable(user, courseCode, examType, paperId);

    const parsed = analyzeCaptureBodySchema.parse(body ?? {});
    const roster = this.cohort.getCourseRoster(user, courseCode);
    const rosterUsns = roster.students.map((student) => student.usn.toUpperCase());

    const cornersDetected = detectSheetCorners(parsed.cornerPoints);
    const usnDetected = cornersDetected
      ? extractUsnFromHeader(parsed.headerText, rosterUsns)
      : null;
    const usnConfidence = usnDetected ? 0.92 : null;

    const captureId = randomUUID();
    this.pending.set(captureId, {
      id: captureId,
      institutionId: user.institutionId,
      courseCode,
      examType,
      cornersDetected,
      detectedUsn: usnDetected,
    });

    const result: SheetCaptureAnalyze = {
      captureId,
      cornersDetected,
      cornerWarning: cornersDetected ? null : CORNER_REPOSITION_WARNING,
      usnDetected,
      usnConfidence,
      requiresManualUsn: cornersDetected && !usnDetected,
    };

    this.actionLogger.logAction({
      action: LogAction.EvaluationSheetCaptureAnalyze,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        captureId,
        cornersDetected,
        usnDetected,
        requiresManualUsn: result.requiresManualUsn,
      },
    });

    return result;
  }

  confirmCapture(
    user: AuthUser,
    courseCode: string,
    examType: string,
    body: unknown,
    paperId?: string,
  ): SheetCaptureConfirm {
    const started = Date.now();
    this.assertWorkflowAvailable(user, courseCode, examType, paperId);

    const parsed = confirmCaptureBodySchema.parse(body);
    const pending = this.pending.get(parsed.captureId);
    if (!pending || pending.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'CAPTURE_NOT_FOUND',
        message: 'Capture session not found — retake the photo',
      });
    }

    if (!pending.cornersDetected) {
      throw new BadRequestException({
        code: 'CORNERS_NOT_DETECTED',
        message: CORNER_REPOSITION_WARNING,
      });
    }

    const roster = this.cohort.getCourseRoster(user, courseCode);
    const usn = parsed.usn.trim().toUpperCase();
    const student = roster.students.find((entry) => entry.usn.toUpperCase() === usn);
    if (!student) {
      throw new BadRequestException({
        code: 'USN_NOT_IN_ROSTER',
        message: 'USN is not enrolled in this course roster',
      });
    }

    const pageNumber = this.store.recordSheetCapture(
      user.institutionId,
      courseCode,
      examType,
      usn,
      user.sub,
    );
    this.pending.delete(parsed.captureId);

    const uploadedTotal = this.store.getProgress(user.institutionId, courseCode, examType).uploaded;

    this.actionLogger.logAction({
      action: LogAction.EvaluationSheetCapture,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        captureId: parsed.captureId,
        usn,
        autoDetected: pending.detectedUsn === usn,
        pageNumber,
        uploadedTotal,
      },
    });

    return {
      captureId: parsed.captureId,
      usn,
      studentName: student.name,
      pageNumber,
      uploadedTotal,
    };
  }

  private assertWorkflowAvailable(
    user: AuthUser,
    courseCode: string,
    examType: string,
    paperId?: string,
  ): void {
    void courseCode;
    void examType;
    if (!paperId) return;

    const access = this.moderation.getEvaluationAccess(user, paperId);
    if (!access.unlocked) {
      throw new BadRequestException({
        code: 'EVALUATION_LOCKED',
        message: access.message,
      });
    }
  }
}
