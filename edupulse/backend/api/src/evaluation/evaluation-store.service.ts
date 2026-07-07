import { Injectable } from '@nestjs/common';
import type { EvaluationProgress } from './evaluation-workflow.schema';
import { PILOT_BCS304_IA2_EVALUATION_PROGRESS } from './pilot-bcs304-ia2-evaluation.seed';

type AssessmentProgress = EvaluationProgress & {
  institutionId: string;
  courseCode: string;
  examType: string;
};

type SheetEvaluationRecord = import('./ai-evaluation.schema').SheetEvaluation;

@Injectable()
export class EvaluationStoreService {
  private readonly progress = new Map<string, AssessmentProgress>();
  private readonly sheetEvaluations = new Map<string, SheetEvaluationRecord>();
  private readonly evaluatedUsns = new Map<string, Set<string>>();
  private readonly facultyReviewedUsns = new Map<string, Set<string>>();

  private key(institutionId: string, courseCode: string, examType: string): string {
    return `${institutionId}:${courseCode}:${examType}`;
  }

  private sheetKey(
    institutionId: string,
    courseCode: string,
    examType: string,
    usn: string,
  ): string {
    return `${this.key(institutionId, courseCode, examType)}:${usn.toUpperCase()}`;
  }

  ensurePilotSeed(institutionId: string, courseCode: string, examType: string): EvaluationProgress {
    const mapKey = this.key(institutionId, courseCode, examType);
    if (!this.progress.has(mapKey) && courseCode === 'BCS304' && examType === 'IA-2') {
      this.progress.set(mapKey, {
        institutionId,
        courseCode,
        examType,
        ...PILOT_BCS304_IA2_EVALUATION_PROGRESS,
      });
    }
    return this.getProgress(institutionId, courseCode, examType);
  }

  getProgress(institutionId: string, courseCode: string, examType: string): EvaluationProgress {
    const record = this.progress.get(this.key(institutionId, courseCode, examType));
    if (!record) {
      return { uploaded: 0, aiEvaluated: 0, facultyReviewed: 0 };
    }
    return {
      uploaded: record.uploaded,
      aiEvaluated: record.aiEvaluated,
      facultyReviewed: record.facultyReviewed,
    };
  }

  recordSheetCapture(
    institutionId: string,
    courseCode: string,
    examType: string,
    usn: string,
    capturedBy: string,
  ): number {
    return this.recordBulkUpload(institutionId, courseCode, examType, 1, capturedBy, usn);
  }

  recordBulkUpload(
    institutionId: string,
    courseCode: string,
    examType: string,
    count: number,
    uploadedBy: string,
    usn?: string,
  ): number {
    void uploadedBy;
    void usn;
    const mapKey = this.key(institutionId, courseCode, examType);
    this.ensurePilotSeed(institutionId, courseCode, examType);
    const current = this.progress.get(mapKey)!;
    const nextUploaded = current.uploaded + count;
    this.progress.set(mapKey, { ...current, uploaded: nextUploaded });
    return nextUploaded;
  }

  getSheetEvaluation(
    institutionId: string,
    courseCode: string,
    examType: string,
    usn: string,
  ): SheetEvaluationRecord | undefined {
    return this.sheetEvaluations.get(this.sheetKey(institutionId, courseCode, examType, usn));
  }

  saveSheetEvaluation(
    institutionId: string,
    courseCode: string,
    examType: string,
    evaluation: SheetEvaluationRecord,
  ): void {
    const assessmentKey = this.key(institutionId, courseCode, examType);
    this.sheetEvaluations.set(
      this.sheetKey(institutionId, courseCode, examType, evaluation.usn),
      evaluation,
    );

    this.ensurePilotSeed(institutionId, courseCode, examType);
    const evaluated = this.evaluatedUsns.get(assessmentKey) ?? new Set<string>();
    if (!evaluated.has(evaluation.usn)) {
      evaluated.add(evaluation.usn);
      this.evaluatedUsns.set(assessmentKey, evaluated);
      const current = this.progress.get(assessmentKey)!;
      this.progress.set(assessmentKey, {
        ...current,
        aiEvaluated: current.aiEvaluated + 1,
      });
    }
  }

  listSheetEvaluations(
    institutionId: string,
    courseCode: string,
    examType: string,
  ): SheetEvaluationRecord[] {
    const prefix = `${this.key(institutionId, courseCode, examType)}:`;
    return [...this.sheetEvaluations.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value);
  }

  recordFacultyReviewProgress(
    institutionId: string,
    courseCode: string,
    examType: string,
    usn: string,
  ): void {
    const evaluation = this.getSheetEvaluation(institutionId, courseCode, examType, usn);
    if (!evaluation) return;

    const pendingFlagged = evaluation.questions.some(
      (question) =>
        question.flaggedForReview &&
        (question.reviewStatus === 'pending'),
    );
    if (pendingFlagged) return;

    const assessmentKey = this.key(institutionId, courseCode, examType);
    this.ensurePilotSeed(institutionId, courseCode, examType);
    const reviewed = this.facultyReviewedUsns.get(assessmentKey) ?? new Set<string>();
    if (reviewed.has(usn)) return;

    reviewed.add(usn);
    this.facultyReviewedUsns.set(assessmentKey, reviewed);
    const current = this.progress.get(assessmentKey)!;
    this.progress.set(assessmentKey, {
      ...current,
      facultyReviewed: current.facultyReviewed + 1,
    });
  }
}
