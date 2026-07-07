import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { AnswerKeyService } from '../paper-craft/answer-key.service';
import { PaperModerationService } from '../paper-craft/paper-moderation.service';
import { TrustCardsService } from '../trust-cards/trust-cards.service';
import {
  MAX_SHEET_EVALUATION_MS,
  type SheetEvaluation,
} from './ai-evaluation.schema';
import {
  buildEvaluationRationale,
  evaluationModelMetadata,
  isFlaggedForReview,
  pilotMarksAwarded,
  pilotQuestionConfidence,
  simulateEvaluationDurationMs,
} from './ai-evaluation.util';
import { EvaluationStoreService } from './evaluation-store.service';
import { getPilotBcs304Ia2Rubric } from './pilot-bcs304-ia2-rubric.seed';

@Injectable()
export class AiEvaluationService {
  constructor(
    private readonly store: EvaluationStoreService,
    private readonly cohort: CohortService,
    private readonly answerKeys: AnswerKeyService,
    private readonly moderation: PaperModerationService,
    private readonly trustCards: TrustCardsService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getEvaluation(
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

  evaluateSheet(
    user: AuthUser,
    courseCode: string,
    examType: string,
    usn: string,
    paperId?: string,
  ): SheetEvaluation {
    const started = Date.now();
    this.assertWorkflowAvailable(user, paperId);

    const normalizedUsn = usn.trim().toUpperCase();
    const roster = this.cohort.getCourseRoster(user, courseCode);
    const student = roster.students.find((entry) => entry.usn.toUpperCase() === normalizedUsn);
    if (!student) {
      throw new BadRequestException({
        code: 'USN_NOT_IN_ROSTER',
        message: 'USN is not enrolled in this course roster',
      });
    }

    const rubricQuestions = this.resolveRubricQuestions(user, courseCode, examType, paperId);
    const sheetTrustCard = this.trustCards.createForSheetEvaluation({
      courseCode,
      examType,
      usn: normalizedUsn,
    });
    const { modelName, promptVersion } = evaluationModelMetadata();

    const questions = rubricQuestions.map((entry) => {
      const confidence = pilotQuestionConfidence(normalizedUsn, entry.questionKey);
      const marksAwarded = pilotMarksAwarded(entry.maxMarks, confidence);
      const questionTrustCard = this.trustCards.createForSheetEvaluation({
        courseCode,
        examType,
        usn: normalizedUsn,
        questionKey: entry.questionKey,
      });

      return {
        questionId: entry.questionId,
        questionKey: entry.questionKey,
        maxMarks: entry.maxMarks,
        marksAwarded,
        aiMarksAwarded: marksAwarded,
        rationale: buildEvaluationRationale(
          entry.questionKey,
          entry.rubricSteps,
          marksAwarded,
          entry.maxMarks,
          confidence,
        ),
        confidence,
        flaggedForReview: isFlaggedForReview(confidence),
        reviewStatus: isFlaggedForReview(confidence) ? ('pending' as const) : ('accepted' as const),
        facultyNote: null,
        reviewedAt: isFlaggedForReview(confidence) ? null : new Date().toISOString(),
        trustCardId: questionTrustCard.id,
      };
    });

    const durationMs = simulateEvaluationDurationMs(normalizedUsn);
    if (durationMs > MAX_SHEET_EVALUATION_MS) {
      throw new BadRequestException({
        code: 'EVALUATION_TOO_SLOW',
        message: 'Sheet evaluation exceeded the 90s pilot latency budget',
      });
    }

    const evaluation: SheetEvaluation = {
      usn: normalizedUsn,
      studentName: student.name,
      courseCode,
      examType,
      paperId: paperId ?? null,
      totalMarks: questions.reduce((sum, question) => sum + question.marksAwarded, 0),
      maxTotalMarks: questions.reduce((sum, question) => sum + question.maxMarks, 0),
      durationMs,
      modelName,
      promptVersion,
      trustCardId: sheetTrustCard.id,
      questions,
      flaggedQuestionCount: questions.filter((question) => question.flaggedForReview).length,
      evaluatedAt: new Date().toISOString(),
    };

    this.store.saveSheetEvaluation(user.institutionId, courseCode, examType, evaluation);

    this.actionLogger.logAction({
      action: LogAction.EvaluationAiRubric,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        usn: normalizedUsn,
        paperId: paperId ?? null,
        modelName,
        promptVersion,
        durationMs,
        totalMarks: evaluation.totalMarks,
        flaggedQuestionCount: evaluation.flaggedQuestionCount,
        withinLatencyBudget: durationMs < MAX_SHEET_EVALUATION_MS,
      },
    });

    return evaluation;
  }

  private resolveRubricQuestions(
    user: AuthUser,
    courseCode: string,
    examType: string,
    paperId?: string,
  ) {
    if (paperId) {
      const answerKey = this.answerKeys.getAnswerKey(user, paperId);
      return answerKey.questions.map((question) => ({
        questionId: question.questionId,
        questionKey: question.questionKey,
        maxMarks: question.maxMarks,
        rubricSteps: question.rubricSteps,
        modelAnswer: question.modelAnswer,
      }));
    }

    if (courseCode === 'BCS304' && examType === 'IA-2') {
      return getPilotBcs304Ia2Rubric();
    }

    throw new BadRequestException({
      code: 'RUBRIC_NOT_AVAILABLE',
      message: 'Provide a moderated paperId or use the BCS304 IA-2 pilot assessment',
    });
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
