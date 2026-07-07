import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { InstitutionsService } from '../institutions/institutions.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { isPdfBuffer } from '../syllabus/syllabus-pdf.util';
import {
  buildBatchReadinessPdf,
  buildBatchReadinessXlsx,
} from './batch-readiness-report-export.util';
import type {
  BatchReadinessExportFormat,
  BatchReadinessExportResult,
  BatchReadinessReportView,
} from './batch-readiness-report.schema';
import { batchReadinessExportFormatSchema } from './batch-readiness-report.schema';
import { PILOT_BATCH_LABEL, PILOT_BATCH_STRENGTH } from './pilot-placement-students.seed';
import { TIER_COLORS, TIER_LABELS } from './readiness-tier.util';
import type { ReadinessTierId } from './readiness-tier.schema';

const PILOT_TIER_ROWS: Array<{ tier: ReadinessTierId; count: number; percent: number }> = [
  { tier: 'dream', count: 18, percent: 12 },
  { tier: 'core', count: 64, percent: 44 },
  { tier: 'mass', count: 41, percent: 28 },
  { tier: 'at_risk', count: 23, percent: 16 },
];

const PILOT_TOP_GAPS = [
  { id: 'communication', label: 'Communication skills', studentCount: 91, severity: 'critical' as const },
  { id: 'dsa', label: 'DSA proficiency', studentCount: 66, severity: 'medium' as const },
  { id: 'quantitative', label: 'Quantitative aptitude', studentCount: 78, severity: 'medium' as const },
  { id: 'backlogs', label: 'Active backlogs', studentCount: 23, severity: 'critical' as const },
];

const PILOT_DEPARTMENTS = [
  { department: 'CSE', readinessPercent: 82, color: '#534AB7' },
  { department: 'ECE', readinessPercent: 74, color: '#AFA9EC' },
  { department: 'MEC', readinessPercent: 61, color: '#CECBF6' },
];

@Injectable()
export class BatchReadinessReportService {
  constructor(
    private readonly actionLogger: StructuredLoggerService,
    private readonly institutions: InstitutionsService,
  ) {}

  getReportView(user: AuthUser): BatchReadinessReportView {
    const started = Date.now();
    const view = this.buildReportView();

    this.actionLogger.logAction({
      action: LogAction.CampusBatchReadinessReportView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        batchStrength: view.batchStrength,
        tierCount: view.tierDistribution.length,
      },
    });

    return view;
  }

  async exportReport(user: AuthUser, formatInput?: string): Promise<BatchReadinessExportResult> {
    const started = Date.now();
    const parsed = batchReadinessExportFormatSchema.safeParse(formatInput ?? 'pdf');

    if (!parsed.success) {
      throw new BadRequestException('format must be pdf or excel');
    }

    const format: BatchReadinessExportFormat = parsed.data;
    const report = this.buildReportView();
    const institution = await this.institutions.getById(user.institutionId);
    const exportedAt = new Date().toISOString();

    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (format === 'pdf') {
      buffer = await buildBatchReadinessPdf(report, institution.name);
      if (!isPdfBuffer(buffer)) {
        throw new BadRequestException('PDF export did not produce a valid document');
      }
      fileName = `batch-readiness-report-${report.reportTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      mimeType = 'application/pdf';
    } else {
      buffer = buildBatchReadinessXlsx(report);
      fileName = `batch-readiness-report-${report.reportTitle.replace(/\s+/g, '-').toLowerCase()}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    const result: BatchReadinessExportResult = {
      format,
      fileName,
      mimeType,
      base64: buffer.toString('base64'),
      exportedAt,
      exportedBy: user.sub,
      exportedByName: user.name,
    };

    this.actionLogger.logAction({
      action: LogAction.CampusBatchReadinessReportExport,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        format,
        fileName,
        batchStrength: report.batchStrength,
      },
    });

    return result;
  }

  private buildReportView(): BatchReadinessReportView {
    const generatedAt = new Date().toISOString();

    return {
      reportTitle: '2027 batch',
      batchLabel: PILOT_BATCH_LABEL,
      batchStrength: PILOT_BATCH_STRENGTH,
      generatedAt,
      tierDistribution: PILOT_TIER_ROWS.map((row) => ({
        tier: row.tier,
        label: TIER_LABELS[row.tier],
        count: row.count,
        percent: row.percent,
        barPercent: row.percent,
        color: TIER_COLORS[row.tier],
      })),
      topGaps: PILOT_TOP_GAPS.map((gap) => ({
        ...gap,
        countLabel:
          gap.id === 'backlogs'
            ? `${gap.studentCount} students`
            : `${gap.studentCount} students low`,
      })),
      departmentReadiness: PILOT_DEPARTMENTS.map((dept) => ({
        department: dept.department,
        readinessPercent: dept.readinessPercent,
        barPercent: dept.readinessPercent,
        color: dept.color,
      })),
      recoveryForecast: {
        currentPlacementPercent: 78,
        projectedPlacementPercent: 86,
        atRiskToCoreCount: 12,
        summary:
          'At current intervention pace, predicted placement % will rise from 78% → 86% by drive season. 12 students projected to move from At-risk to Core tier.',
      },
      interventionPriorityRoute: '/intervention-priority',
    };
  }
}
