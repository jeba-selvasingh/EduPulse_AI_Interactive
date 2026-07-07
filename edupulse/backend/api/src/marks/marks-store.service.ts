import { Injectable } from '@nestjs/common';
import type { AssessmentQuestion } from './marks.schema';
import type { ErpExportTemplate } from './marks-export.schema';
import { buildPilotBcs304ErpExportTemplate } from './pilot-bcs304-erp-export.seed';

type CellKey = string;

type AssessmentRecord = {
  assessmentId: string;
  institutionId: string;
  courseCode: string;
  examType: string;
  questions: AssessmentQuestion[];
};

type SavedCell = {
  marks: number;
  savedAt: string;
  savedBy: string;
};

export type PublishRecord = {
  batchId: string;
  publishedAt: string;
  publishedBy: string;
  source: 'evaluation_ai' | 'manual';
  recordCount: number;
  publishedStudents: number;
};

@Injectable()
export class MarksStoreService {
  private readonly assessments = new Map<string, AssessmentRecord>();
  private readonly cells = new Map<string, Map<CellKey, SavedCell>>();
  private readonly published = new Map<string, PublishRecord>();
  private readonly exportTemplates = new Map<string, ErpExportTemplate>();

  private assessmentKey(institutionId: string, courseCode: string, examType: string): string {
    return `${institutionId}:${courseCode}:${examType}`;
  }

  private cellKey(usn: string, questionId: string): CellKey {
    return `${usn}:${questionId}`;
  }

  ensureAssessment(record: AssessmentRecord): AssessmentRecord {
    const key = this.assessmentKey(record.institutionId, record.courseCode, record.examType);
    if (!this.assessments.has(key)) {
      this.assessments.set(key, record);
      this.cells.set(key, new Map());
    }
    return this.assessments.get(key)!;
  }

  getAssessment(
    institutionId: string,
    courseCode: string,
    examType: string,
  ): AssessmentRecord | undefined {
    return this.assessments.get(this.assessmentKey(institutionId, courseCode, examType));
  }

  getSavedCells(institutionId: string, courseCode: string, examType: string): Map<CellKey, SavedCell> {
    const key = this.assessmentKey(institutionId, courseCode, examType);
    return this.cells.get(key) ?? new Map();
  }

  saveCell(
    institutionId: string,
    courseCode: string,
    examType: string,
    usn: string,
    questionId: string,
    marks: number,
    savedBy: string,
  ): void {
    const key = this.assessmentKey(institutionId, courseCode, examType);
    const bucket = this.cells.get(key) ?? new Map<CellKey, SavedCell>();
    bucket.set(this.cellKey(usn, questionId), {
      marks,
      savedAt: new Date().toISOString(),
      savedBy,
    });
    this.cells.set(key, bucket);
  }

  clearCell(
    institutionId: string,
    courseCode: string,
    examType: string,
    usn: string,
    questionId: string,
  ): void {
    const key = this.assessmentKey(institutionId, courseCode, examType);
    const bucket = this.cells.get(key);
    bucket?.delete(this.cellKey(usn, questionId));
  }

  getPublishRecord(
    institutionId: string,
    courseCode: string,
    examType: string,
  ): PublishRecord | undefined {
    return this.published.get(this.assessmentKey(institutionId, courseCode, examType));
  }

  markPublished(
    institutionId: string,
    courseCode: string,
    examType: string,
    record: PublishRecord,
  ): PublishRecord {
    const key = this.assessmentKey(institutionId, courseCode, examType);
    this.published.set(key, record);
    return record;
  }

  isPublished(institutionId: string, courseCode: string, examType: string): boolean {
    return this.published.has(this.assessmentKey(institutionId, courseCode, examType));
  }

  getExportTemplate(
    institutionId: string,
    courseCode: string,
    examType: string,
  ): ErpExportTemplate {
    const key = this.assessmentKey(institutionId, courseCode, examType);
    const existing = this.exportTemplates.get(key);
    if (existing) return existing;

    if (courseCode === 'BCS304' && examType === 'IA-2') {
      const seeded = buildPilotBcs304ErpExportTemplate('pes');
      this.exportTemplates.set(key, seeded);
      return seeded;
    }

    const fallback = buildPilotBcs304ErpExportTemplate('inst');
    this.exportTemplates.set(key, fallback);
    return fallback;
  }

  setExportTemplate(
    institutionId: string,
    courseCode: string,
    examType: string,
    template: ErpExportTemplate,
  ): ErpExportTemplate {
    const key = this.assessmentKey(institutionId, courseCode, examType);
    this.exportTemplates.set(key, template);
    return template;
  }
}
