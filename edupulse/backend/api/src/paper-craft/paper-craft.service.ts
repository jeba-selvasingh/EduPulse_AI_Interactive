import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import type { BlueprintRecord } from '../blueprint/blueprint.schema';
import type { SyllabusModule, SyllabusRecord } from '../syllabus/syllabus.schema';
import type { BloomTargets, DifficultyProfile } from '../blueprint/blueprint.schema';
import { TrustCardsService } from '../trust-cards/trust-cards.service';
import {
  DEFAULT_GENERATION_QUESTIONS,
  GENERATION_TIMEOUT_MS,
  MAX_GENERATION_QUESTIONS,
  type DifficultyBand,
  type GeneratedQuestion,
  type QuestionPaper,
  type SimilarityWarning,
} from './paper-craft.schema';
import { PaperCraftStoreService } from './paper-craft-store.service';
import { PaperModerationStoreService } from './paper-moderation-store.service';
import { findPastPaperMatch } from './pilot-past-papers.seed';
import {
  PILOT_BCS304_QUESTION_STEMS,
  coTagForModule,
  poTagForModule,
} from './pilot-bcs304-questions.seed';

@Injectable()
export class PaperCraftService {
  constructor(
    private readonly store: PaperCraftStoreService,
    private readonly moderationStore: PaperModerationStoreService,
    private readonly trustCards: TrustCardsService,
  ) {}

  getPaper(user: AuthUser, paperId: string): QuestionPaper {
    const paper = this.store.getById(paperId);
    if (!paper || paper.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'PAPER_NOT_FOUND',
        message: 'Generated question paper not found',
      });
    }
    return paper;
  }

  generatePaper(options: {
    user: AuthUser;
    courseCode: string;
    examType: string;
    syllabus: SyllabusRecord;
    modules: SyllabusModule[];
    blueprint: BlueprintRecord;
    syllabusSources: Array<{ label: string; kind: 'syllabus' }>;
    questionCount?: number;
  }): QuestionPaper {
    const started = Date.now();
    const questionCount = clampQuestionCount(options.questionCount);

    if (options.modules.length === 0) {
      throw new BadRequestException({
        code: 'NO_SYLLABUS_MODULES',
        message: 'Define syllabus modules before generating a question paper',
      });
    }

    const paperId = randomUUID();
    const trustCard = this.trustCards.createForPaperGeneration({
      courseCode: options.courseCode,
      examType: options.examType,
      syllabusSources: options.syllabusSources,
    });

    const bloomLevels = distributeBloomLevels(questionCount, options.blueprint.bloom);
    const difficultyBands = distributeDifficultyBands(
      questionCount,
      options.blueprint.difficulty,
    );
    const marksPerQuestion = allocateMarks(100, questionCount);

    const questions: GeneratedQuestion[] = [];
    const moduleStemIndex = new Map<number, number>();

    for (let index = 0; index < questionCount; index++) {
      const module = options.modules[index % options.modules.length]!;
      const stemSlot = moduleStemIndex.get(module.moduleNumber) ?? 0;
      const stem = pickQuestionStem(module.moduleNumber, stemSlot);
      moduleStemIndex.set(module.moduleNumber, stemSlot + 1);
      const questionKey = `Q${index + 1}a`;
      const similarityWarning = detectSimilarityWarning(stem, module.moduleNumber);

      questions.push({
        id: randomUUID(),
        questionKey,
        moduleNumber: module.moduleNumber,
        moduleTitle: module.title,
        marks: marksPerQuestion[index]!,
        bloomLevel: bloomLevels[index]!,
        coTag: coTagForModule(module.moduleNumber),
        poTag: poTagForModule(module.moduleNumber),
        difficulty: difficultyBands[index]!,
        text: stem,
        trustCardId: trustCard.id,
        similarityWarning,
        stemVariant: 0,
      });
    }

    const durationMs = Date.now() - started;
    if (durationMs > GENERATION_TIMEOUT_MS) {
      throw new BadRequestException({
        code: 'GENERATION_TIMEOUT',
        message: `Paper generation exceeded ${GENERATION_TIMEOUT_MS / 1000}s pilot limit`,
      });
    }

    const paper: QuestionPaper = {
      id: paperId,
      institutionId: options.user.institutionId,
      courseCode: options.courseCode,
      examType: options.examType,
      syllabusVersionId: options.syllabus.id,
      syllabusVersion: options.syllabus.version,
      blueprintId: options.blueprint.id,
      trustCardId: trustCard.id,
      totalMarks: marksPerQuestion.reduce((sum, marks) => sum + marks, 0),
      questionCount,
      durationMs,
      generatedBy: options.user.sub,
      generatedAt: new Date().toISOString(),
      questions,
    };

    return this.store.save(paper);
  }

  regenerateQuestion(
    user: AuthUser,
    paperId: string,
    questionId: string,
  ): { paper: QuestionPaper; question: GeneratedQuestion; replacedFlagged: boolean } {
    if (this.moderationStore.isPackageLocked(paperId)) {
      throw new ConflictException({
        code: 'PACKAGE_LOCKED',
        message: 'Paper package is locked while awaiting moderation or after approval',
      });
    }

    const paper = this.getPaper(user, paperId);
    const index = paper.questions.findIndex((q) => q.id === questionId);
    if (index < 0) {
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: 'Question not found on this paper',
      });
    }

    const current = paper.questions[index]!;
    const replacedFlagged = Boolean(current.similarityWarning);
    const nextVariant = (current.stemVariant ?? 0) + 1;
    const stem = pickQuestionStem(current.moduleNumber, nextVariant, current.text);
    const similarityWarning = detectSimilarityWarning(stem, current.moduleNumber);

    const updated: GeneratedQuestion = {
      ...current,
      id: randomUUID(),
      text: stem,
      stemVariant: nextVariant,
      similarityWarning,
    };

    const questions = [...paper.questions];
    questions[index] = updated;

    const saved = this.store.save({
      ...paper,
      questions,
    });

    return { paper: saved, question: updated, replacedFlagged };
  }
}

function clampQuestionCount(count?: number): number {
  if (count === undefined) return DEFAULT_GENERATION_QUESTIONS;
  return Math.min(MAX_GENERATION_QUESTIONS, Math.max(1, Math.floor(count)));
}

function allocateMarks(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function distributeBloomLevels(count: number, bloom: BloomTargets): Array<1 | 2 | 3 | 4 | 5> {
  const pool: Array<1 | 2 | 3 | 4 | 5> = [];
  const entries: Array<{ level: 1 | 2 | 3 | 4 | 5; weight: number }> = [
    { level: 1, weight: bloom.l1 },
    { level: 2, weight: bloom.l2 },
    { level: 3, weight: bloom.l3 },
    { level: 4, weight: bloom.l4 },
    { level: 5, weight: bloom.l5 },
  ];

  for (const entry of entries) {
    const slots = Math.round((count * entry.weight) / 100);
    for (let i = 0; i < slots; i++) pool.push(entry.level);
  }

  while (pool.length < count) pool.push(3);
  while (pool.length > count) pool.pop();

  return pool.slice(0, count);
}

function distributeDifficultyBands(
  count: number,
  difficulty: DifficultyProfile,
): DifficultyBand[] {
  const pool: DifficultyBand[] = [];
  const entries: Array<{ band: DifficultyBand; weight: number }> = [
    { band: 'easy', weight: difficulty.easy },
    { band: 'moderate', weight: difficulty.moderate },
    { band: 'hard', weight: difficulty.hard },
  ];

  for (const entry of entries) {
    const slots = Math.round((count * entry.weight) / 100);
    for (let i = 0; i < slots; i++) pool.push(entry.band);
  }

  while (pool.length < count) pool.push('moderate');
  while (pool.length > count) pool.pop();

  return pool.slice(0, count);
}

function pickQuestionStem(
  moduleNumber: number,
  index: number,
  excludeText?: string,
): string {
  const stems = PILOT_BCS304_QUESTION_STEMS[moduleNumber];
  if (!stems?.length) {
    return `Write short notes on key concepts from module ${moduleNumber} with suitable examples.`;
  }

  for (let offset = 0; offset < stems.length; offset++) {
    const candidate = stems[(index + offset) % stems.length]!.text;
    if (!excludeText || candidate !== excludeText) {
      return candidate;
    }
  }

  return stems[index % stems.length]!.text;
}

function detectSimilarityWarning(
  text: string,
  moduleNumber: number,
): SimilarityWarning | null {
  const match = findPastPaperMatch(text, moduleNumber);
  if (!match) return null;
  return {
    similarityPct: match.similarityPct,
    matchedReference: match.reference,
  };
}
