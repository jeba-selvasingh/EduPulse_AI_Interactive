import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { MarksStoreService } from '../marks/marks-store.service';
import type { AcademicLevelView, AcademicSubject } from './academic-level.schema';
import {
  bloomSummary,
  buildSubjectDiagnosisRoute,
  competencyFromBloom,
  percentToBloomLevel,
} from './academic-level.util';
import { resolveDiagnosisUsn } from './diagnosis-scope.util';
import {
  DEV_STUDENT_EMAIL,
  PILOT_ACADEMIC_SUBJECTS,
  PILOT_STUDENT_NAME,
} from './pilot-student-academic-level.seed';

@Injectable()
export class AcademicLevelService {
  constructor(
    private readonly marksStore: MarksStoreService,
    private readonly cohort: CohortService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getView(user: AuthUser, requestedUsn?: string): AcademicLevelView {
    const started = Date.now();
    const usn = resolveDiagnosisUsn(user, requestedUsn);
    const studentName = this.resolveStudentName(user.institutionId, usn, user);

    const subjects = PILOT_ACADEMIC_SUBJECTS.map((seed) =>
      this.buildSubject(user.institutionId, usn, seed),
    ).filter((subject) => subject.hasPublishedMarks);

    this.actionLogger.logAction({
      action: LogAction.DiagnosisAcademicLevelView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        usn,
        subjectCount: subjects.length,
        decliningCount: subjects.filter((subject) => subject.trendWarning).length,
      },
    });

    return {
      usn,
      studentName,
      subjects,
      ladderCaption: 'NEP competency ladder · per subject · tap any subject to diagnose',
    };
  }

  private resolveStudentName(institutionId: string, usn: string, user: AuthUser): string {
    if (user.roles.includes('student') && user.email === DEV_STUDENT_EMAIL) {
      return PILOT_STUDENT_NAME;
    }

    const roster = this.cohort.getCourseRoster(
      { institutionId, sub: '', email: '', name: '', roles: [] },
      'BCS304',
    );
    const match = roster.students.find((student) => student.usn === usn);
    return match?.name ?? PILOT_STUDENT_NAME;
  }

  private buildSubject(
    institutionId: string,
    usn: string,
    seed: (typeof PILOT_ACADEMIC_SUBJECTS)[number],
  ): AcademicSubject {
    const hasPublishedMarks = seed.publishedExamType
      ? this.marksStore.isPublished(institutionId, seed.courseCode, seed.publishedExamType)
      : true;

    let competency = seed.competency;
    let highestBloomLevel = seed.highestBloomLevel;
    let summary = seed.summary;

    if (seed.publishedExamType && hasPublishedMarks) {
      const derived = this.deriveFromPublishedMarks(
        institutionId,
        usn,
        seed.courseCode,
        seed.publishedExamType,
      );
      if (derived) {
        highestBloomLevel = derived.bloomLevel;
        competency = competencyFromBloom(derived.bloomLevel);
        if (derived.percent >= 70) {
          summary = `Operates up to Bloom L${derived.bloomLevel} · ${derived.percent}% on latest published assessment`;
        } else {
          summary = bloomSummary(derived.bloomLevel, seed.courseName);
        }
      }
    }

    const trendWarning = seed.trend === 'down';

    return {
      courseCode: seed.courseCode,
      courseName: seed.courseName,
      competency,
      highestBloomLevel,
      trend: seed.trend,
      trendWarning,
      summary,
      hasPublishedMarks,
      diagnosisRoute: buildSubjectDiagnosisRoute(seed.courseCode, usn),
    };
  }

  private deriveFromPublishedMarks(
    institutionId: string,
    usn: string,
    courseCode: string,
    examType: string,
  ): { percent: number; bloomLevel: number } | null {
    const assessment = this.marksStore.getAssessment(institutionId, courseCode, examType);
    if (!assessment) return null;

    const cells = this.marksStore.getSavedCells(institutionId, courseCode, examType);
    let earned = 0;
    let max = 0;

    for (const question of assessment.questions) {
      const cell = cells.get(`${usn}:${question.id}`);
      if (cell) {
        earned += cell.marks;
      }
      max += question.maxMarks;
    }

    if (max === 0) return null;
    const percent = Math.round((earned / max) * 100);
    return { percent, bloomLevel: percentToBloomLevel(percent) };
  }
}
