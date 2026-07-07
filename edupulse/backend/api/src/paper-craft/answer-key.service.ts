import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { ExplainabilityService } from '../explainability/explainability.service';
import { TrustCardsService } from '../trust-cards/trust-cards.service';
import {
  type PaperAnswerKey,
  type QuestionAnswerKey,
  isRubricValid,
  sumRubricMarks,
  updateModelAnswerBodySchema,
} from './answer-key.schema';
import { buildPilotAnswerKeyContent } from './pilot-bcs304-answer-keys.seed';
import { PaperCraftStoreService } from './paper-craft-store.service';
import { PaperModerationStoreService } from './paper-moderation-store.service';

@Injectable()
export class AnswerKeyService {
  private readonly answerKeysByPaperId = new Map<string, PaperAnswerKey>();

  constructor(
    private readonly papers: PaperCraftStoreService,
    private readonly moderationStore: PaperModerationStoreService,
    private readonly trustCards: TrustCardsService,
    private readonly explainability: ExplainabilityService,
  ) {}

  getAnswerKey(user: AuthUser, paperId: string): PaperAnswerKey {
    const record = this.answerKeysByPaperId.get(paperId);
    if (!record || record.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'ANSWER_KEY_NOT_FOUND',
        message: 'Answer key not generated for this paper yet',
      });
    }
    return record;
  }

  getQuestionAnswerKey(
    user: AuthUser,
    paperId: string,
    questionId: string,
  ): QuestionAnswerKey {
    const answerKey = this.getAnswerKey(user, paperId);
    const question = answerKey.questions.find((entry) => entry.questionId === questionId);
    if (!question) {
      throw new NotFoundException({
        code: 'ANSWER_KEY_QUESTION_NOT_FOUND',
        message: 'Answer key entry not found for this question',
      });
    }
    return question;
  }

  generateAnswerKey(user: AuthUser, paperId: string): PaperAnswerKey {
    if (this.moderationStore.isPackageLocked(paperId)) {
      throw new ConflictException({
        code: 'PACKAGE_LOCKED',
        message: 'Paper package is locked while awaiting moderation or after approval',
      });
    }

    const paper = this.papers.getById(paperId);
    if (!paper || paper.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'PAPER_NOT_FOUND',
        message: 'Generated question paper not found',
      });
    }

    const questions: QuestionAnswerKey[] = paper.questions.map((question) => {
      const { modelAnswer, rubricSteps } = buildPilotAnswerKeyContent(
        question.text,
        question.marks,
      );
      const rubricTotal = sumRubricMarks(rubricSteps);
      const trustCard = this.trustCards.createForAnswerKey({
        courseCode: paper.courseCode,
        examType: paper.examType,
        questionKey: question.questionKey,
      });

      return {
        questionId: question.id,
        questionKey: question.questionKey,
        maxMarks: question.marks,
        modelAnswer,
        rubricSteps,
        trustCardId: trustCard.id,
        rubricTotal,
        isValid: isRubricValid(rubricSteps, question.marks),
      };
    });

    const invalid = questions.find((entry) => !entry.isValid);
    if (invalid) {
      throw new BadRequestException({
        code: 'RUBRIC_INVALID',
        message: `Rubric for ${invalid.questionKey} does not sum to max marks`,
      });
    }

    const record: PaperAnswerKey = {
      paperId: paper.id,
      institutionId: paper.institutionId,
      courseCode: paper.courseCode,
      examType: paper.examType,
      generatedAt: new Date().toISOString(),
      generatedBy: user.sub,
      questions,
    };

    this.answerKeysByPaperId.set(paper.id, record);
    return record;
  }

  updateModelAnswer(
    user: AuthUser,
    paperId: string,
    questionId: string,
    body: unknown,
  ): QuestionAnswerKey {
    if (this.moderationStore.isPackageLocked(paperId)) {
      throw new ConflictException({
        code: 'PACKAGE_LOCKED',
        message: 'Paper package is locked while awaiting moderation or after approval',
      });
    }

    const parsed = updateModelAnswerBodySchema.parse(body);
    const record = this.getAnswerKey(user, paperId);
    const index = record.questions.findIndex((entry) => entry.questionId === questionId);
    if (index < 0) {
      throw new NotFoundException({
        code: 'ANSWER_KEY_QUESTION_NOT_FOUND',
        message: 'Answer key entry not found for this question',
      });
    }

    const current = record.questions[index]!;
    const beforeValue = current.modelAnswer;
    const afterValue = parsed.modelAnswer.trim();

    if (beforeValue === afterValue) {
      return current;
    }

    const updated: QuestionAnswerKey = {
      ...current,
      modelAnswer: afterValue,
      editedAt: new Date().toISOString(),
      editedBy: user.sub,
    };

    const questions = [...record.questions];
    questions[index] = updated;
    this.answerKeysByPaperId.set(paperId, { ...record, questions });

    this.explainability.appendAuditEvent(user, {
      artifactId: current.trustCardId,
      eventType: 'edit',
      summary: `Faculty edited model answer for ${current.questionKey}`,
      field: 'modelAnswer',
      beforeValue: truncateForAudit(beforeValue),
      afterValue: truncateForAudit(afterValue),
    });

    return updated;
  }
}

function truncateForAudit(value: string, max = 500): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
