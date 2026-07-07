import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { PaperModerationService } from '../paper-craft/paper-moderation.service';
import {
  bulkUploadBodySchema,
  MAX_BULK_UPLOAD_BYTES,
  type BulkUploadSummary,
} from './bulk-upload.schema';
import {
  BULK_SIZE_LIMIT_MESSAGE,
  extractUsnFromFileName,
  inferUploadKind,
  lowDpiWarning,
  normalizeUploadEntries,
  resolveUploadByteLength,
} from './bulk-upload.util';
import { EvaluationStoreService } from './evaluation-store.service';

@Injectable()
export class BulkUploadService {
  constructor(
    private readonly store: EvaluationStoreService,
    private readonly cohort: CohortService,
    private readonly moderation: PaperModerationService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getSample(user: AuthUser, courseCode: string, examType: string) {
    void user;
    void examType;
    const roster = this.cohort.getCourseRoster(user, courseCode);
    const students = roster.students.slice(0, 3);

    return {
      fileName: `${courseCode}-${examType}-sheets.zip`,
      instructions: 'Name each PDF by USN (e.g. PES1UG23CS001.pdf) before zipping.',
      entries: students.map((student, index) => ({
        fileName: `${student.usn}.pdf`,
        estimatedDpi: index === 2 ? 150 : 300,
        studentName: student.name,
      })),
    };
  }

  upload(
    user: AuthUser,
    courseCode: string,
    examType: string,
    body: unknown,
    paperId?: string,
  ): BulkUploadSummary {
    const started = Date.now();
    this.assertWorkflowAvailable(user, paperId);

    const parsed = bulkUploadBodySchema.parse(body ?? {});
    const byteLength = resolveUploadByteLength(parsed);

    if (byteLength > MAX_BULK_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: 'BULK_UPLOAD_TOO_LARGE',
        message: BULK_SIZE_LIMIT_MESSAGE,
      });
    }

    const kind = inferUploadKind(parsed.fileName);
    const entries = normalizeUploadEntries(parsed);

    if (kind === 'zip' && entries.length === 0) {
      throw new BadRequestException({
        code: 'ZIP_ENTRIES_REQUIRED',
        message: 'ZIP upload must include USN-named PDF entries',
      });
    }

    const roster = this.cohort.getCourseRoster(user, courseCode);
    const rosterByUsn = new Map(
      roster.students.map((student) => [student.usn.toUpperCase(), student]),
    );

    const mapped: BulkUploadSummary['mapped'] = [];
    const usnMismatches: BulkUploadSummary['usnMismatches'] = [];
    const qualityWarnings: BulkUploadSummary['qualityWarnings'] = [];

    for (const entry of entries) {
      const usn = extractUsnFromFileName(entry.fileName);
      if (!usn) {
        usnMismatches.push({
          fileName: entry.fileName,
          message: 'Filename must contain a valid USN (e.g. PES1UG23CS001.pdf)',
        });
        continue;
      }

      const student = rosterByUsn.get(usn);
      if (!student) {
        usnMismatches.push({
          fileName: entry.fileName,
          message: `USN ${usn} is not enrolled in ${courseCode}`,
        });
        continue;
      }

      const warning = lowDpiWarning(entry.estimatedDpi);
      if (warning) {
        qualityWarnings.push({ fileName: entry.fileName, message: warning });
      }

      mapped.push({
        fileName: entry.fileName,
        usn,
        studentName: student.name,
        estimatedDpi: entry.estimatedDpi,
        lowDpiWarning: warning,
      });
    }

    const uploadedTotal = this.store.recordBulkUpload(
      user.institutionId,
      courseCode,
      examType,
      mapped.length,
      user.sub,
    );

    const summary: BulkUploadSummary = {
      fileName: parsed.fileName,
      kind,
      byteLength,
      acceptedCount: mapped.length,
      rejectedCount: usnMismatches.length,
      usnMismatches,
      qualityWarnings,
      mapped,
      uploadedTotal,
    };

    this.actionLogger.logAction({
      action: LogAction.EvaluationBulkUpload,
      durationMs: Date.now() - started,
      outcome: mapped.length > 0 ? 'success' : 'failure',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        fileName: parsed.fileName,
        kind,
        byteLength,
        acceptedCount: mapped.length,
        rejectedCount: usnMismatches.length,
        qualityWarningCount: qualityWarnings.length,
        uploadedTotal,
      },
    });

    return summary;
  }

  private assertWorkflowAvailable(user: AuthUser, paperId?: string): void {
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
