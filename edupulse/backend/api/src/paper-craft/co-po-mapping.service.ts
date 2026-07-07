import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import {
  CO_ADEQUACY_THRESHOLD,
  type CoCoverageEntry,
  type PaperCoPoMapping,
  type QuestionCoPoMapping,
  type StrengthWeight,
  updateCoPoMappingBodySchema,
} from './co-po-mapping.schema';
import {
  PILOT_BCS304_COURSE_OUTCOMES,
  defaultStrengthForBloom,
  rationaleForModule,
} from './pilot-bcs304-course-outcomes.seed';
import { PaperCraftStoreService } from './paper-craft-store.service';
import { PaperModerationStoreService } from './paper-moderation-store.service';

@Injectable()
export class CoPoMappingService {
  private readonly mappingsByPaperId = new Map<string, PaperCoPoMapping>();

  constructor(
    private readonly papers: PaperCraftStoreService,
    private readonly moderationStore: PaperModerationStoreService,
  ) {}

  getMapping(user: AuthUser, paperId: string): PaperCoPoMapping {
    const existing = this.mappingsByPaperId.get(paperId);
    if (existing) {
      if (existing.institutionId !== user.institutionId) {
        throw new NotFoundException({
          code: 'CO_PO_MAPPING_NOT_FOUND',
          message: 'CO/PO mapping not found for this paper',
        });
      }
      return existing;
    }

    return this.buildFromPaper(user, paperId);
  }

  updateQuestionMapping(
    user: AuthUser,
    paperId: string,
    questionId: string,
    body: unknown,
  ): { mapping: QuestionCoPoMapping; coverage: CoCoverageEntry[]; readyForSubmit: boolean } {
    if (this.moderationStore.isPackageLocked(paperId)) {
      throw new ConflictException({
        code: 'PACKAGE_LOCKED',
        message: 'Paper package is locked while awaiting moderation or after approval',
      });
    }

    const parsed = updateCoPoMappingBodySchema.parse(body);
    if (!parsed.coTag && !parsed.poTag && parsed.strengthWeight === undefined) {
      throw new BadRequestException({
        code: 'NO_MAPPING_CHANGES',
        message: 'Provide coTag, poTag, or strengthWeight to update',
      });
    }

    const record = this.getMapping(user, paperId);
    const index = record.questions.findIndex((entry) => entry.questionId === questionId);
    if (index < 0) {
      throw new NotFoundException({
        code: 'MAPPING_QUESTION_NOT_FOUND',
        message: 'Question mapping not found for this paper',
      });
    }

    const current = record.questions[index]!;
    const updated: QuestionCoPoMapping = {
      ...current,
      coTag: parsed.coTag ?? current.coTag,
      poTag: parsed.poTag ?? current.poTag,
      strengthWeight: parsed.strengthWeight ?? current.strengthWeight,
      editedAt: new Date().toISOString(),
      editedBy: user.sub,
    };

    const questions = [...record.questions];
    questions[index] = updated;

    const coverage = computeCoverage(questions);
    const underRepresentedCount = coverage.filter((entry) => entry.isUnderRepresented).length;
    const saved: PaperCoPoMapping = {
      ...record,
      questions,
      coverage,
      underRepresentedCount,
      readyForSubmit: underRepresentedCount === 0,
    };

    this.mappingsByPaperId.set(paperId, saved);

    return {
      mapping: updated,
      coverage,
      readyForSubmit: saved.readyForSubmit,
    };
  }

  private buildFromPaper(user: AuthUser, paperId: string): PaperCoPoMapping {
    const paper = this.papers.getById(paperId);
    if (!paper || paper.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'PAPER_NOT_FOUND',
        message: 'Generated question paper not found',
      });
    }

    const questions: QuestionCoPoMapping[] = paper.questions.map((question) => ({
      questionId: question.id,
      questionKey: question.questionKey,
      moduleNumber: question.moduleNumber,
      marks: question.marks,
      coTag: question.coTag,
      poTag: question.poTag,
      strengthWeight: defaultStrengthForBloom(question.bloomLevel),
      rationale: rationaleForModule(question.moduleNumber),
    }));

    const coverage = computeCoverage(questions);
    const underRepresentedCount = coverage.filter((entry) => entry.isUnderRepresented).length;

    const record: PaperCoPoMapping = {
      paperId: paper.id,
      institutionId: paper.institutionId,
      courseCode: paper.courseCode,
      examType: paper.examType,
      generatedAt: new Date().toISOString(),
      generatedBy: user.sub,
      questions,
      coverage,
      underRepresentedCount,
      readyForSubmit: underRepresentedCount === 0,
    };

    this.mappingsByPaperId.set(paper.id, record);
    return record;
  }
}

export function computeCoverage(questions: QuestionCoPoMapping[]): CoCoverageEntry[] {
  return PILOT_BCS304_COURSE_OUTCOMES.map((outcome) => {
    const mapped = questions.filter((question) => question.coTag === outcome.coTag);
    const weightedScore = mapped.reduce((sum, question) => sum + question.strengthWeight, 0);
    const questionCount = mapped.length;

    let status: CoCoverageEntry['status'];
    if (questionCount === 0) {
      status = 'missing';
    } else if (weightedScore < CO_ADEQUACY_THRESHOLD) {
      status = 'low';
    } else {
      status = 'adequate';
    }

    const coveragePct = Math.min(
      100,
      Math.round((weightedScore / CO_ADEQUACY_THRESHOLD) * 100),
    );

    return {
      coTag: outcome.coTag,
      title: outcome.title,
      weightedScore,
      questionCount,
      coveragePct,
      status,
      isUnderRepresented: status !== 'adequate',
    };
  });
}
