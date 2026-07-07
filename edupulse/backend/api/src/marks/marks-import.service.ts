import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { MarksImportSummary, MarksImportTemplate } from './marks-import.schema';
import { marksImportBodySchema } from './marks-import.schema';
import {
  buildMarksImportCsv,
  buildMarksImportXlsx,
  isRowEmpty,
  normalizeHeaderCell,
  parseMarkValue,
  parseMarksImportRows,
} from './marks-import.util';
import { MarksService } from './marks.service';

@Injectable()
export class MarksImportService {
  constructor(
    private readonly marks: MarksService,
    private readonly cohort: CohortService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getTemplate(user: AuthUser, courseCode: string, examType: string): MarksImportTemplate {
    const assessment = this.marks.ensureAssessmentForImport(user, courseCode, examType);
    const fileName = `${courseCode}-${examType}-marks-template.xlsx`;
    const csv = buildMarksImportCsv(assessment.questions);
    const base64 = buildMarksImportXlsx(assessment.questions).toString('base64');

    return {
      fileName,
      base64,
      csv,
      header: ['USN', 'Student Name', ...assessment.questions.map((question) => question.questionKey)],
    };
  }

  getSample(user: AuthUser, courseCode: string, examType: string): MarksImportTemplate {
    const assessment = this.marks.ensureAssessmentForImport(user, courseCode, examType);
    const roster = this.cohort.getCourseRoster(user, courseCode);
    const dataRows = roster.students.slice(0, 5).map((student, index) => [
      student.usn,
      student.name,
      String(7 + (index % 3)),
      String(6 + (index % 2)),
      String(8 - (index % 4)),
    ]);

    const fileName = `${courseCode}-${examType}-marks-sample.xlsx`;
    return {
      fileName,
      base64: buildMarksImportXlsx(assessment.questions, dataRows).toString('base64'),
      csv: buildMarksImportCsv(assessment.questions, dataRows),
      header: ['USN', 'Student Name', ...assessment.questions.map((question) => question.questionKey)],
    };
  }

  import(
    user: AuthUser,
    courseCode: string,
    examType: string,
    body: unknown,
  ): MarksImportSummary {
    const started = Date.now();
    const parsed = marksImportBodySchema.parse(body);
    const assessment = this.marks.ensureAssessmentForImport(user, courseCode, examType);

    if (this.marks.isAssessmentPublished(user, courseCode, examType)) {
      throw new BadRequestException({
        code: 'MARKS_PUBLISHED_READONLY',
        message: 'Published marks are read-only in Mark Matrix',
      });
    }

    const roster = this.cohort.getCourseRoster(user, courseCode);
    const rosterByUsn = new Map(roster.students.map((student) => [student.usn.toUpperCase(), student.usn]));

    const matrix = parseMarksImportRows(parsed);
    if (matrix.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_IMPORT',
        message: 'Import file contains no rows',
      });
    }

    const headerRow = matrix[0] ?? [];
    const headerCells = headerRow.map(normalizeHeaderCell);
    const usnIndex = headerCells.findIndex((cell) => cell === 'usn');
    if (usnIndex < 0) {
      throw new BadRequestException({
        code: 'INVALID_TEMPLATE',
        message: 'Template must include a USN column',
      });
    }

    const questionColumns = assessment.questions.map((question) => {
      const index = headerCells.findIndex(
        (cell) => cell === question.questionKey.toLowerCase() || cell === question.id.toLowerCase(),
      );
      return { question, index };
    });

    const missingQuestion = questionColumns.find((column) => column.index < 0);
    if (missingQuestion) {
      throw new BadRequestException({
        code: 'INVALID_TEMPLATE',
        message: `Template missing marks column for ${missingQuestion.question.questionKey}`,
      });
    }

    const errors: MarksImportSummary['errors'] = [];
    const usnMismatches: MarksImportSummary['usnMismatches'] = [];
    const cellsToImport: Array<{ usn: string; questionId: string; marks: number }> = [];
    let rowsProcessed = 0;
    let rowsImported = 0;

    for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] ?? [];
      if (isRowEmpty(row)) continue;

      rowsProcessed += 1;
      const excelRow = rowIndex + 1;
      const usnRaw = String(row[usnIndex] ?? '').trim();
      if (!usnRaw) {
        errors.push({
          row: excelRow,
          message: 'USN is required',
          code: 'PARSE',
        });
        continue;
      }

      const canonicalUsn = rosterByUsn.get(usnRaw.toUpperCase());
      if (!canonicalUsn) {
        usnMismatches.push({
          row: excelRow,
          usn: usnRaw,
          message: 'USN not found in course roster — resolve manually before import',
        });
        errors.push({
          row: excelRow,
          usn: usnRaw,
          message: 'USN not enrolled in this course',
          code: 'USN_MISMATCH',
        });
        continue;
      }

      let rowHasValidationError = false;
      const rowCells: Array<{ usn: string; questionId: string; marks: number }> = [];

      for (const { question, index } of questionColumns) {
        const raw = row[index];
        const parsedMark = parseMarkValue(raw);
        if (parsedMark === 'invalid') {
          rowHasValidationError = true;
          errors.push({
            row: excelRow,
            usn: canonicalUsn,
            column: question.questionKey,
            message: `Invalid mark in ${question.questionKey}`,
            code: 'PARSE',
          });
          continue;
        }

        if (parsedMark === null) continue;

        if (parsedMark > question.maxMarks) {
          rowHasValidationError = true;
          errors.push({
            row: excelRow,
            usn: canonicalUsn,
            column: question.questionKey,
            message: `Mark cannot exceed ${question.maxMarks}`,
            code: 'VALIDATION',
          });
          continue;
        }

        if (parsedMark < 0) {
          rowHasValidationError = true;
          errors.push({
            row: excelRow,
            usn: canonicalUsn,
            column: question.questionKey,
            message: 'Mark cannot be negative',
            code: 'VALIDATION',
          });
          continue;
        }

        rowCells.push({
          usn: canonicalUsn,
          questionId: question.id,
          marks: parsedMark,
        });
      }

      if (rowCells.length > 0 && !rowHasValidationError) {
        rowsImported += 1;
      }

      cellsToImport.push(...rowCells);
    }

    const importResult = this.marks.importCells(user, courseCode, examType, cellsToImport);

    this.actionLogger.logAction({
      action: LogAction.MarksExcelImport,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        rowsProcessed,
        rowsImported,
        cellsImported: importResult.cellsImported,
        errorCount: errors.length,
        usnMismatchCount: usnMismatches.length,
      },
    });

    return {
      rowsProcessed,
      rowsImported,
      cellsImported: importResult.cellsImported,
      errors,
      usnMismatches,
      grid: importResult.grid,
    };
  }
}
