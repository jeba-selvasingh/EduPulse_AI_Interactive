import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { ExplainabilityService } from '../explainability/explainability.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import {
  facultyReviewOverrideSchema,
  type FacultyReviewDetail,
  type FlaggedReviewItem,
  type SheetEvaluation,
} from './ai-evaluation.schema';
import { facultyReviewWaiveSchema } from './evaluation-publish.schema';
import { EvaluationStoreService } from './evaluation-store.service';
import { buildScannedSnippet } from './faculty-review.util';

@Injectable()
export class FacultyReviewService {
  constructor(
    private readonly store: EvaluationStoreService,
    private readonly explainability: ExplainabilityService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  listFlaggedItems(user: AuthUser, courseCode: string, examType: string): FlaggedReviewItem[] {
    const evaluations = this.store.listSheetEvaluations(user.institutionId, courseCode, examType);
    const items: FlaggedReviewItem[] = [];

    for (const evaluation of evaluations) {
      for (const question of evaluation.questions) {
        if (!question.flaggedForReview) continue;
        items.push(this.toReviewItem(evaluation, question));
      }
    }

    return items.sort((a, b) => {
      if (a.reviewStatus === 'pending' && b.reviewStatus !== 'pending') return -1;
      if (b.reviewStatus === 'pending' && a.reviewStatus !== 'pending') return 1;
      return a.usn.localeCompare(b.usn);
    });
  }

  getReviewDetail(
    user: AuthUser,
    courseCode: string,
    examType: string,
    usn: string,
    questionId: string,
  ): FacultyReviewDetail {
    const evaluation = this.requireEvaluation(user, courseCode, examType, usn);
    const question = this.requireFlaggedQuestion(evaluation, questionId);
    const snippet = buildScannedSnippet(evaluation.usn, question.questionKey);

    return {
      ...this.toReviewItem(evaluation, question),
      scannedSnippet: snippet.scannedSnippet,
      snippetCaption: snippet.snippetCaption,
    };
  }

  acceptReview(
    user: AuthUser,
    courseCode: string,
    examType: string,
    usn: string,
    questionId: string,
  ): FacultyReviewDetail {
    const started = Date.now();
    const evaluation = this.requireEvaluation(user, courseCode, examType, usn);
    const question = this.requireFlaggedQuestion(evaluation, questionId);

    if (question.reviewStatus !== 'pending') {
      throw new BadRequestException({
        code: 'REVIEW_ALREADY_COMPLETED',
        message: 'This question has already been reviewed',
      });
    }

    const updatedQuestion = {
      ...question,
      reviewStatus: 'accepted' as const,
      reviewedAt: new Date().toISOString(),
      facultyNote: null,
    };

    const updated = this.persistQuestionReview(
      user.institutionId,
      courseCode,
      examType,
      evaluation,
      questionId,
      updatedQuestion,
    );

    this.explainability.appendAuditEvent(user, {
      artifactId: question.trustCardId,
      eventType: 'approval',
      summary: `Faculty accepted AI mark for ${question.questionKey}`,
      field: 'marksAwarded',
      beforeValue: String(question.aiMarksAwarded),
      afterValue: String(updatedQuestion.marksAwarded),
    });

    this.logReviewAction(user, courseCode, examType, usn, questionId, 'accept', Date.now() - started);

    return this.getReviewDetail(user, courseCode, examType, usn, questionId);
  }

  overrideReview(
    user: AuthUser,
    courseCode: string,
    examType: string,
    usn: string,
    questionId: string,
    input: unknown,
  ): FacultyReviewDetail {
    const started = Date.now();
    const parsed = facultyReviewOverrideSchema.parse(input);
    const evaluation = this.requireEvaluation(user, courseCode, examType, usn);
    const question = this.requireFlaggedQuestion(evaluation, questionId);

    if (question.reviewStatus !== 'pending') {
      throw new BadRequestException({
        code: 'REVIEW_ALREADY_COMPLETED',
        message: 'This question has already been reviewed',
      });
    }

    if (parsed.marksAwarded > question.maxMarks) {
      throw new BadRequestException({
        code: 'MARKS_ABOVE_MAX',
        message: `Marks cannot exceed ${question.maxMarks}`,
      });
    }

    const note = parsed.facultyNote.trim();
    if (!note) {
      throw new BadRequestException({
        code: 'FACULTY_NOTE_REQUIRED',
        message: 'A faculty note is required when overriding AI marks',
      });
    }

    const updatedQuestion = {
      ...question,
      marksAwarded: parsed.marksAwarded,
      reviewStatus: 'overridden' as const,
      facultyNote: note,
      reviewedAt: new Date().toISOString(),
    };

    this.persistQuestionReview(
      user.institutionId,
      courseCode,
      examType,
      evaluation,
      questionId,
      updatedQuestion,
    );

    this.explainability.appendAuditEvent(user, {
      artifactId: question.trustCardId,
      eventType: 'override',
      summary: note,
      field: 'marksAwarded',
      beforeValue: String(question.aiMarksAwarded),
      afterValue: String(parsed.marksAwarded),
    });

    this.logReviewAction(user, courseCode, examType, usn, questionId, 'override', Date.now() - started, {
      facultyNote: note,
      beforeMarks: question.aiMarksAwarded,
      afterMarks: parsed.marksAwarded,
    });

    return this.getReviewDetail(user, courseCode, examType, usn, questionId);
  }

  waiveReview(
    user: AuthUser,
    courseCode: string,
    examType: string,
    usn: string,
    questionId: string,
    input: unknown,
  ): FacultyReviewDetail {
    const started = Date.now();
    const parsed = facultyReviewWaiveSchema.parse(input);
    const evaluation = this.requireEvaluation(user, courseCode, examType, usn);
    const question = this.requireFlaggedQuestion(evaluation, questionId);

    if (question.reviewStatus !== 'pending') {
      throw new BadRequestException({
        code: 'REVIEW_ALREADY_COMPLETED',
        message: 'This question has already been reviewed',
      });
    }

    const note = parsed.waiverReason.trim();
    if (!note) {
      throw new BadRequestException({
        code: 'WAIVER_REASON_REQUIRED',
        message: 'A waiver reason is required to skip faculty review',
      });
    }

    const updatedQuestion = {
      ...question,
      reviewStatus: 'waived' as const,
      facultyNote: note,
      reviewedAt: new Date().toISOString(),
    };

    this.persistQuestionReview(
      user.institutionId,
      courseCode,
      examType,
      evaluation,
      questionId,
      updatedQuestion,
    );

    this.explainability.appendAuditEvent(user, {
      artifactId: question.trustCardId,
      eventType: 'override',
      summary: `Faculty waived review: ${note}`,
      field: 'reviewStatus',
      beforeValue: 'pending',
      afterValue: 'waived',
    });

    this.logReviewAction(user, courseCode, examType, usn, questionId, 'waive', Date.now() - started, {
      waiverReason: note,
    });

    return this.getReviewDetail(user, courseCode, examType, usn, questionId);
  }

  private persistQuestionReview(
    institutionId: string,
    courseCode: string,
    examType: string,
    evaluation: SheetEvaluation,
    questionId: string,
    updatedQuestion: SheetEvaluation['questions'][number],
  ): SheetEvaluation {
    const questions = evaluation.questions.map((entry) =>
      entry.questionId === questionId ? updatedQuestion : entry,
    );
    const totalMarks = questions.reduce((sum, entry) => sum + entry.marksAwarded, 0);
    const updated: SheetEvaluation = {
      ...evaluation,
      questions,
      totalMarks,
      flaggedQuestionCount: questions.filter((entry) => entry.flaggedForReview).length,
    };

    this.store.saveSheetEvaluation(institutionId, courseCode, examType, updated);
    this.store.recordFacultyReviewProgress(institutionId, courseCode, examType, evaluation.usn);
    return updated;
  }

  private requireEvaluation(
    user: AuthUser,
    courseCode: string,
    examType: string,
    usn: string,
  ): SheetEvaluation {
    const record = this.store.getSheetEvaluation(user.institutionId, courseCode, examType, usn);
    if (!record) {
      throw new NotFoundException({
        code: 'SHEET_EVALUATION_NOT_FOUND',
        message: 'AI evaluation not found for this USN',
      });
    }
    return record;
  }

  private requireFlaggedQuestion(evaluation: SheetEvaluation, questionId: string) {
    const question = evaluation.questions.find((entry) => entry.questionId === questionId);
    if (!question) {
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: 'Question not found on this evaluation',
      });
    }
    if (!question.flaggedForReview) {
      throw new BadRequestException({
        code: 'QUESTION_NOT_FLAGGED',
        message: 'Only flagged low-confidence questions require faculty review',
      });
    }
    return question;
  }

  private toReviewItem(
    evaluation: SheetEvaluation,
    question: SheetEvaluation['questions'][number],
  ): FlaggedReviewItem {
    return {
      usn: evaluation.usn,
      studentName: evaluation.studentName,
      questionId: question.questionId,
      questionKey: question.questionKey,
      maxMarks: question.maxMarks,
      marksAwarded: question.marksAwarded,
      aiMarksAwarded: question.aiMarksAwarded,
      rationale: question.rationale,
      confidence: question.confidence,
      reviewStatus: question.reviewStatus,
      facultyNote: question.facultyNote ?? null,
      trustCardId: question.trustCardId,
    };
  }

  private logReviewAction(
    user: AuthUser,
    courseCode: string,
    examType: string,
    usn: string,
    questionId: string,
    action: 'accept' | 'override' | 'waive',
    durationMs: number,
    metadata: Record<string, unknown> = {},
  ): void {
    this.actionLogger.logAction({
      action: LogAction.EvaluationFacultyReview,
      durationMs,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        usn,
        questionId,
        action,
        ...metadata,
      },
    });
  }
}
