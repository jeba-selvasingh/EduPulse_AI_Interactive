import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import {
  type MarksGrid,
  type PartialSaveResult,
  partialSaveBodySchema,
} from './marks.schema';
import { MarksStoreService } from './marks-store.service';
import { PILOT_BCS304_IA2_QUESTIONS } from './pilot-bcs304-ia2-assessment.seed';

const PILOT_EXAM_TYPE = 'IA-2';
const PILOT_COURSE = 'BCS304';

@Injectable()
export class MarksService {
  constructor(
    private readonly store: MarksStoreService,
    private readonly cohort: CohortService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getGrid(user: AuthUser, courseCode: string, examType: string): MarksGrid {
    const assessment = this.ensurePilotAssessment(user, courseCode, examType);
    return this.buildGrid(user, assessment);
  }

  partialSave(
    user: AuthUser,
    courseCode: string,
    examType: string,
    body: unknown,
  ): PartialSaveResult {
    const started = Date.now();
    const parsed = partialSaveBodySchema.parse(body);
    const assessment = this.ensurePilotAssessment(user, courseCode, examType);

    if (this.store.isPublished(user.institutionId, courseCode, examType)) {
      throw new BadRequestException({
        code: 'MARKS_PUBLISHED_READONLY',
        message: 'Published marks are read-only in Mark Matrix',
      });
    }

    const { rejected } = this.applyCells(
      user,
      assessment,
      parsed.cells.map((cell) => ({
        usn: cell.usn,
        questionId: cell.questionId,
        marks: cell.marks,
      })),
    );

    const grid = this.buildGrid(user, assessment);

    this.actionLogger.logAction({
      action: LogAction.MarksPartialSave,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        cellsRequested: parsed.cells.length,
        cellsRejected: rejected.length,
        savedCells: grid.completion.savedCells,
        totalCells: grid.completion.totalCells,
      },
    });

    return { grid, rejected };
  }

  importCells(
    user: AuthUser,
    courseCode: string,
    examType: string,
    cells: Array<{ usn: string; questionId: string; marks: number }>,
  ): { grid: MarksGrid; cellsImported: number } {
    const assessment = this.ensurePilotAssessment(user, courseCode, examType);
    const { cellsImported } = this.applyCells(user, assessment, cells);
    return {
      grid: this.buildGrid(user, assessment),
      cellsImported,
    };
  }

  ensureAssessmentForImport(user: AuthUser, courseCode: string, examType: string) {
    return this.ensurePilotAssessment(user, courseCode, examType);
  }

  isAssessmentPublished(user: AuthUser, courseCode: string, examType: string): boolean {
    return this.store.isPublished(user.institutionId, courseCode, examType);
  }

  private applyCells(
    user: AuthUser,
    assessment: {
      institutionId: string;
      courseCode: string;
      examType: string;
      questions: Array<{ id: string; maxMarks: number }>;
    },
    cells: Array<{ usn: string; questionId: string; marks: number | null }>,
  ): { rejected: PartialSaveResult['rejected']; cellsImported: number } {
    const questionById = new Map(assessment.questions.map((question) => [question.id, question]));
    const roster = this.cohort.getCourseRoster(user, assessment.courseCode);
    const validUsns = new Set(roster.students.map((student) => student.usn));

    const rejected: PartialSaveResult['rejected'] = [];
    let cellsImported = 0;

    for (const cell of cells) {
      if (!validUsns.has(cell.usn)) {
        rejected.push({
          usn: cell.usn,
          questionId: cell.questionId,
          message: 'USN not enrolled in this course',
        });
        continue;
      }

      const question = questionById.get(cell.questionId);
      if (!question) {
        rejected.push({
          usn: cell.usn,
          questionId: cell.questionId,
          message: 'Unknown question',
        });
        continue;
      }

      if (cell.marks === null) {
        this.store.clearCell(
          user.institutionId,
          assessment.courseCode,
          assessment.examType,
          cell.usn,
          cell.questionId,
        );
        continue;
      }

      if (cell.marks > question.maxMarks) {
        rejected.push({
          usn: cell.usn,
          questionId: cell.questionId,
          message: `Mark cannot exceed ${question.maxMarks}`,
        });
        continue;
      }

      this.store.saveCell(
        user.institutionId,
        assessment.courseCode,
        assessment.examType,
        cell.usn,
        cell.questionId,
        cell.marks,
        user.sub,
      );
      cellsImported += 1;
    }

    return { rejected, cellsImported };
  }

  private ensurePilotAssessment(
    user: AuthUser,
    courseCode: string,
    examType: string,
  ) {
    if (courseCode !== PILOT_COURSE || examType !== PILOT_EXAM_TYPE) {
      throw new NotFoundException({
        code: 'ASSESSMENT_NOT_FOUND',
        message: `No marks assessment configured for ${courseCode} ${examType}`,
      });
    }

    return this.store.ensureAssessment({
      assessmentId: `${courseCode}-${examType}`,
      institutionId: user.institutionId,
      courseCode,
      examType,
      questions: PILOT_BCS304_IA2_QUESTIONS,
    });
  }

  private buildGrid(
    user: AuthUser,
    assessment: {
      assessmentId: string;
      institutionId: string;
      courseCode: string;
      examType: string;
      questions: Array<{ id: string; questionKey: string; maxMarks: number }>;
    },
  ): MarksGrid {
    const roster = this.cohort.getCourseRoster(user, assessment.courseCode);
    const saved = this.store.getSavedCells(
      assessment.institutionId,
      assessment.courseCode,
      assessment.examType,
    );
    const publishRecord = this.store.getPublishRecord(
      assessment.institutionId,
      assessment.courseCode,
      assessment.examType,
    );
    const isPublished = Boolean(publishRecord);

    let savedCells = 0;
    let completedStudents = 0;
    let lastSavedAt: string | null = null;
    let lastSavedBy: string | null = null;

    const rows = roster.students.map((student) => {
      const cells = assessment.questions.map((question) => {
        const key = `${student.usn}:${question.id}`;
        const entry = saved.get(key);
        if (entry) {
          savedCells += 1;
          if (!lastSavedAt || entry.savedAt > lastSavedAt) {
            lastSavedAt = entry.savedAt;
            lastSavedBy = entry.savedBy;
          }
          return {
            usn: student.usn,
            questionId: question.id,
            marks: entry.marks,
            isSaved: true,
            isReadOnly: isPublished,
            validationError: null,
          };
        }

        return {
          usn: student.usn,
          questionId: question.id,
          marks: null,
          isSaved: false,
          isReadOnly: isPublished,
          validationError: null,
        };
      });

      const filled = cells.filter((cell) => cell.isSaved);
      const rowTotal =
        filled.length === assessment.questions.length
          ? filled.reduce((sum, cell) => sum + (cell.marks ?? 0), 0)
          : null;

      if (filled.length === assessment.questions.length) {
        completedStudents += 1;
      }

      return {
        usn: student.usn,
        studentName: student.name,
        cells,
        rowTotal,
      };
    });

    const totalCells = roster.students.length * assessment.questions.length;

    return {
      assessmentId: assessment.assessmentId,
      courseCode: assessment.courseCode,
      examType: assessment.examType,
      institutionId: assessment.institutionId,
      questions: assessment.questions,
      rows,
      completion: {
        savedCells,
        totalCells,
        completedStudents,
        totalStudents: roster.students.length,
      },
      lastSavedAt,
      lastSavedBy,
      isPublished,
      isReadOnly: isPublished,
      publishedAt: publishRecord?.publishedAt ?? null,
      publishedBy: publishRecord?.publishedBy ?? null,
      source: publishRecord?.source ?? null,
      publishBatchId: publishRecord?.batchId ?? null,
    };
  }
}
