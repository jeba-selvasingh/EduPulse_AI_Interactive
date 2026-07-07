import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { MarksStoreService } from '../marks/marks-store.service';
import { resolveDiagnosisUsn } from './diagnosis-scope.util';
import type { ProgressTrackingView } from './progress-tracking.schema';
import {
  PILOT_COMPANIES_ELIGIBILITY,
  PILOT_CONCEPT_DELTAS,
  PILOT_PROGRESS_PROJECTION,
  PILOT_READINESS_POINTS,
} from './pilot-progress-tracking.seed';
import {
  DEV_STUDENT_EMAIL,
  PILOT_STUDENT_NAME,
  PILOT_STUDENT_USN,
} from './pilot-student-academic-level.seed';
import { computeBarHeights, readinessTrendLabel } from './progress-tracking.util';

const MIN_HISTORY_POINTS = 3;

@Injectable()
export class ProgressTrackingService {
  constructor(
    private readonly marksStore: MarksStoreService,
    private readonly cohort: CohortService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getView(user: AuthUser, requestedUsn?: string): ProgressTrackingView {
    const started = Date.now();
    const usn = resolveDiagnosisUsn(user, requestedUsn);
    const studentName = this.resolveStudentName(user.institutionId, usn, user);

    const view = this.buildView(user.institutionId, usn, studentName);

    this.actionLogger.logAction({
      action: LogAction.DiagnosisProgressView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        usn,
        dataPointCount: view.dataPointCount,
        readinessTrendLabel: view.readinessTrendLabel,
      },
    });

    return view;
  }

  private buildView(
    institutionId: string,
    usn: string,
    studentName: string,
  ): ProgressTrackingView {
    if (usn === PILOT_STUDENT_USN) {
      return this.buildPilotView(usn, studentName, institutionId);
    }

    throw new NotFoundException({
      code: 'PROGRESS_HISTORY_NOT_FOUND',
      message: 'Progress history is not available for this student yet',
    });
  }

  private buildPilotView(
    usn: string,
    studentName: string,
    institutionId: string,
  ): ProgressTrackingView {
    const readinessPoints = computeBarHeights(PILOT_READINESS_POINTS);

    if (readinessPoints.length < MIN_HISTORY_POINTS) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_HISTORY',
        message: `At least ${MIN_HISTORY_POINTS} assessment data points are required for progress tracking`,
      });
    }

    const conceptDeltas = this.maybeAugmentConceptDeltas(institutionId, usn);

    return {
      usn,
      studentName,
      readinessTrendLabel: readinessTrendLabel(readinessPoints),
      readinessPoints,
      conceptDeltas,
      companiesEligibility: PILOT_COMPANIES_ELIGIBILITY,
      projection: PILOT_PROGRESS_PROJECTION,
      dataPointCount: readinessPoints.length,
    };
  }

  private maybeAugmentConceptDeltas(institutionId: string, usn: string) {
    const published = this.marksStore.isPublished(institutionId, 'BCS304', 'IA-2');
    if (!published) {
      return PILOT_CONCEPT_DELTAS;
    }

    return PILOT_CONCEPT_DELTAS.map((delta) =>
      delta.conceptName === 'DBMS normalization'
        ? { ...delta, deltaLabel: `${delta.fromScore} → ${delta.toScore} ↑` }
        : delta,
    );
  }

  private resolveStudentName(institutionId: string, usn: string, user: AuthUser): string {
    if (user.roles.includes('student') && user.email === DEV_STUDENT_EMAIL) {
      return PILOT_STUDENT_NAME;
    }

    const roster = this.cohort.getCourseRoster(
      { institutionId, sub: '', email: '', name: '', roles: [] },
      'BCS304',
    );
    return roster.students.find((student) => student.usn === usn)?.name ?? PILOT_STUDENT_NAME;
  }
}
