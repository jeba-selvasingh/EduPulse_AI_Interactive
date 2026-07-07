import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { AuthUser } from '../auth/auth.types';
import {
  PILOT_ACADEMIC_TERM,
  type ActivateVersionResult,
  type SyllabusGenerationWarning,
  type SyllabusModule,
  type SyllabusModuleInput,
  type SyllabusRecord,
  type SyllabusUploadResult,
} from './syllabus.schema';
import { formatModuleSourceLabel } from './syllabus-modules.util';
import {
  decodeBase64Payload,
  isPdfBuffer,
  MINIMAL_PDF_BYTES,
} from './syllabus-pdf.util';
import { SyllabusStorageService } from './syllabus-storage.service';
import { SyllabusStoreService } from './syllabus-store.service';

@Injectable()
export class SyllabusService {
  constructor(
    private readonly store: SyllabusStoreService,
    private readonly storage: SyllabusStorageService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getSamplePdfBase64(): string {
    return MINIMAL_PDF_BYTES.toString('base64');
  }

  getCourseSyllabus(
    user: AuthUser,
    courseCode: string,
    academicTerm = PILOT_ACADEMIC_TERM,
  ): SyllabusRecord {
    const record = this.store.getActive(user.institutionId, courseCode, academicTerm);

    if (!record) {
      throw new NotFoundException({
        code: 'SYLLABUS_NOT_FOUND',
        message: `No active syllabus for ${courseCode.toUpperCase()} (${academicTerm}).`,
      });
    }

    return record;
  }

  getSyllabusById(user: AuthUser, syllabusId: string): SyllabusRecord {
    const record = this.store.getById(syllabusId);
    if (!record || record.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'SYLLABUS_NOT_FOUND',
        message: 'Syllabus version not found.',
      });
    }
    return record;
  }

  listVersions(
    user: AuthUser,
    courseCode: string,
    academicTerm = PILOT_ACADEMIC_TERM,
  ): SyllabusRecord[] {
    return this.store.listVersions(user.institutionId, courseCode, academicTerm);
  }

  activateVersion(
    user: AuthUser,
    courseCode: string,
    syllabusId: string,
    academicTerm = PILOT_ACADEMIC_TERM,
  ): ActivateVersionResult {
    const started = Date.now();
    const target = this.getSyllabusById(user, syllabusId);

    if (target.courseCode !== courseCode.toUpperCase() || target.academicTerm !== academicTerm) {
      throw new BadRequestException({
        code: 'VERSION_COURSE_MISMATCH',
        message: 'Syllabus version does not match course or term.',
      });
    }

    if (target.status === 'active') {
      return { activated: target, superseded: null };
    }

    if (target.status === 'superseded') {
      throw new BadRequestException({
        code: 'VERSION_ALREADY_SUPERSEDED',
        message: 'Cannot activate a superseded syllabus version.',
      });
    }

    const result = this.store.setActive(
      user.institutionId,
      courseCode,
      academicTerm,
      syllabusId,
    );

    this.actionLogger.logAction({
      action: LogAction.SyllabusVersionActivate,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode: target.courseCode,
        academicTerm: target.academicTerm,
        activatedVersion: result.activated.version,
        supersededVersion: result.superseded?.version ?? null,
      },
    });

    return result;
  }

  getGenerationWarning(
    user: AuthUser,
    syllabusVersionId: string,
  ): SyllabusGenerationWarning | null {
    const requested = this.getSyllabusById(user, syllabusVersionId);
    if (requested.status !== 'superseded') {
      return null;
    }

    const active = this.store.getActive(
      user.institutionId,
      requested.courseCode,
      requested.academicTerm,
    );

    if (!active) {
      return null;
    }

    return {
      code: 'SUPERSEDED_SYLLABUS',
      message: `Syllabus v${requested.version} was superseded. Active curriculum is v${active.version}. Proceed only if intentional.`,
      syllabusVersionId: requested.id,
      activeVersionId: active.id,
      activeVersion: active.version,
      supersededVersion: requested.version,
    };
  }

  assertGenerationAllowed(
    user: AuthUser,
    courseCode: string,
    options: { syllabusVersionId?: string; acknowledgeSuperseded?: boolean },
  ): SyllabusRecord {
    const academicTerm = PILOT_ACADEMIC_TERM;
    const syllabusId = options.syllabusVersionId;

    if (!syllabusId) {
      return this.getCourseSyllabus(user, courseCode, academicTerm);
    }

    const warning = this.getGenerationWarning(user, syllabusId);
    if (warning && !options.acknowledgeSuperseded) {
      throw new ConflictException(warning);
    }

    return this.getSyllabusById(user, syllabusId);
  }

  listModulesForSyllabus(syllabusId: string): SyllabusModule[] {
    return this.store.listModules(syllabusId);
  }

  listModules(
    user: AuthUser,
    courseCode: string,
    academicTerm = PILOT_ACADEMIC_TERM,
    syllabusVersionId?: string,
  ): SyllabusModule[] {
    const syllabus = syllabusVersionId
      ? this.getSyllabusById(user, syllabusVersionId)
      : this.getCourseSyllabus(user, courseCode, academicTerm);
    return this.store.listModules(syllabus.id);
  }

  saveModules(
    user: AuthUser,
    courseCode: string,
    inputs: SyllabusModuleInput[],
    academicTerm = PILOT_ACADEMIC_TERM,
    syllabusVersionId?: string,
  ): SyllabusModule[] {
    const started = Date.now();
    const syllabus = syllabusVersionId
      ? this.getSyllabusById(user, syllabusVersionId)
      : this.getCourseSyllabus(user, courseCode, academicTerm);

    const modules: SyllabusModule[] = inputs.map((input) => {
      if (input.pageEnd < input.pageStart) {
        throw new BadRequestException({
          code: 'INVALID_PAGE_RANGE',
          message: `Module ${input.moduleNumber}: end page must be >= start page.`,
        });
      }

      return {
        id: crypto.randomUUID(),
        syllabusId: syllabus.id,
        moduleNumber: input.moduleNumber,
        title: input.title,
        pageStart: input.pageStart,
        pageEnd: input.pageEnd,
      };
    });

    const numbers = modules.map((m) => m.moduleNumber);
    if (new Set(numbers).size !== numbers.length) {
      throw new BadRequestException({
        code: 'DUPLICATE_MODULE_NUMBER',
        message: 'Module numbers must be unique.',
      });
    }

    const saved = this.store.saveModules(syllabus.id, modules);

    this.actionLogger.logAction({
      action: LogAction.SyllabusModulesSave,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode: syllabus.courseCode,
        syllabusId: syllabus.id,
        moduleCount: saved.length,
      },
    });

    return saved;
  }

  getModuleSourceLabelsForSyllabus(syllabusId: string): string[] {
    return this.listModulesForSyllabus(syllabusId).map(formatModuleSourceLabel);
  }

  async uploadPdf(
    user: AuthUser,
    courseCode: string,
    input: { fileName: string; base64: string; academicTerm?: string },
  ): Promise<SyllabusUploadResult> {
    const started = Date.now();
    const academicTerm = input.academicTerm ?? PILOT_ACADEMIC_TERM;
    const normalizedCourse = courseCode.toUpperCase();

    let bytes: Buffer;
    try {
      bytes = decodeBase64Payload(input.base64);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_BASE64',
        message: 'File payload is not valid base64.',
      });
    }

    if (!isPdfBuffer(bytes)) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: 'Only PDF syllabus files are accepted.',
      });
    }

    const fileName = input.fileName.toLowerCase().endsWith('.pdf')
      ? input.fileName
      : `${input.fileName}.pdf`;

    const version = this.store.nextVersionNumber(
      user.institutionId,
      normalizedCourse,
      academicTerm,
    );

    const storageKey = this.storage.buildStorageKey(
      user.institutionId,
      normalizedCourse,
      academicTerm,
      `v${version}-${fileName}`,
    );

    const hasActive = Boolean(
      this.store.getActive(user.institutionId, normalizedCourse, academicTerm),
    );

    const record: SyllabusRecord = {
      id: crypto.randomUUID(),
      institutionId: user.institutionId,
      courseCode: normalizedCourse,
      academicTerm,
      fileName,
      storageKey,
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
      uploadedBy: user.sub,
      uploadedAt: new Date().toISOString(),
      version,
      status: hasActive ? 'pending' : 'pending',
      activatedAt: null,
      supersededAt: null,
    };

    try {
      await this.storage.savePdf(storageKey, bytes);
      const saved = this.store.addVersion(record, !hasActive);

      this.actionLogger.logAction({
        action: LogAction.SyllabusUpload,
        durationMs: Date.now() - started,
        outcome: 'success',
        institutionId: user.institutionId,
        userId: user.sub,
        metadata: {
          courseCode: record.courseCode,
          academicTerm: record.academicTerm,
          fileName: record.fileName,
          sizeBytes: record.sizeBytes,
          version: saved.version,
          status: saved.status,
          storageKey: record.storageKey,
        },
      });

      return {
        record: saved,
        requiresActivation: saved.status === 'pending',
      };
    } catch (error: unknown) {
      this.actionLogger.logAction({
        action: LogAction.SyllabusUpload,
        durationMs: Date.now() - started,
        outcome: 'failure',
        institutionId: user.institutionId,
        userId: user.sub,
        metadata: {
          courseCode: record.courseCode,
          reason: error instanceof Error ? error.message : 'storage_failed',
        },
      });
      throw error;
    }
  }
}
