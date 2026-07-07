import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { ExplainabilityService } from '../explainability/explainability.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { ErpExportTemplate, MarksCsvExport } from './marks-export.schema';
import { updateErpExportTemplateSchema } from './marks-export.schema';
import { buildMarksExportCsv } from './marks-export.util';
import { MarksService } from './marks.service';
import { MarksStoreService } from './marks-store.service';

@Injectable()
export class MarksExportService {
  constructor(
    private readonly marks: MarksService,
    private readonly store: MarksStoreService,
    private readonly institutions: InstitutionsService,
    private readonly explainability: ExplainabilityService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getExportTemplate(user: AuthUser, courseCode: string, examType: string): ErpExportTemplate {
    return this.store.getExportTemplate(user.institutionId, courseCode, examType);
  }

  updateExportTemplate(
    user: AuthUser,
    courseCode: string,
    examType: string,
    body: unknown,
  ): ErpExportTemplate {
    const parsed = updateErpExportTemplateSchema.parse(body);
    const current = this.store.getExportTemplate(user.institutionId, courseCode, examType);
    return this.store.setExportTemplate(user.institutionId, courseCode, examType, {
      templateId: parsed.templateId ?? current.templateId,
      institutionSlug: current.institutionSlug,
      columns: parsed.columns,
    });
  }

  async exportPublishedCsv(
    user: AuthUser,
    courseCode: string,
    examType: string,
  ): Promise<MarksCsvExport> {
    const started = Date.now();

    if (!this.store.isPublished(user.institutionId, courseCode, examType)) {
      throw new BadRequestException({
        code: 'MARKS_NOT_PUBLISHED',
        message: 'Only published marks can be exported to ERP CSV',
      });
    }

    const grid = this.marks.getGrid(user, courseCode, examType);
    const template = this.store.getExportTemplate(user.institutionId, courseCode, examType);
    const institution = await this.institutions.getById(user.institutionId);
    const institutionCode = institution.code;
    const { csv, fileName, rowCount } = buildMarksExportCsv(grid, template, institutionCode);
    const exportedAt = new Date().toISOString();
    const artifactId = randomUUID();

    this.explainability.appendAuditEvent(user, {
      artifactId,
      eventType: 'edit',
      summary: `Exported published marks CSV (${rowCount} rows) for ${courseCode} ${examType}`,
      field: 'erpCsvExport',
      afterValue: fileName,
    });

    this.actionLogger.logAction({
      action: LogAction.MarksCsvExport,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        fileName,
        rowCount,
        templateId: template.templateId,
        assessmentId: grid.assessmentId,
        artifactId,
      },
    });

    return {
      fileName,
      csv,
      contentType: 'text/csv',
      rowCount,
      exportedAt,
      templateId: template.templateId,
      assessmentId: grid.assessmentId,
      courseCode,
      examType,
      institutionCode,
    };
  }
}
