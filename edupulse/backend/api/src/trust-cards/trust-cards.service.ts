import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ExplainabilityService } from '../explainability/explainability.service';
import type { TrustCard } from './trust-cards.schema';

type TrustCardCore = Omit<TrustCard, 'auditTrail'>;

const PILOT_TRUST_CARDS: TrustCardCore[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    artifactType: 'question',
    artifactLabel: 'Question Q1a · BCS304 SEE paper',
    modelName: 'qwen2.5-14b · local',
    promptVersion: 'qp_gen v14',
    confidence: 0.86,
    blueprintCheckStatus: 'pass',
    verified: true,
    sources: [
      { label: 'Pattern profile VTU/BCS304 v3', kind: 'pattern_profile' },
      { label: 'Syllabus module 1, pages 4–6', kind: 'syllabus' },
      { label: 'Style exemplar · SEE 2023 Q4', kind: 'exemplar' },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    artifactType: 'evaluation',
    artifactLabel: 'Answer sheet eval · Roll 2024CS042',
    modelName: 'qwen2.5-14b · local',
    promptVersion: 'eval_rubric v6',
    confidence: 0.81,
    blueprintCheckStatus: 'pass',
    verified: true,
    sources: [
      { label: 'Approved rubric · BCS304 IA-2', kind: 'other' },
      { label: 'Scanned sheet page 1–3', kind: 'evaluation' },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    artifactType: 'insight',
    artifactLabel: 'AI diagnosis · normalization gap',
    modelName: 'qwen2.5-14b · local',
    promptVersion: 'diagnosis v3',
    confidence: 0.79,
    blueprintCheckStatus: 'pending',
    verified: false,
    sources: [
      { label: 'Mark matrix CO3 evidence', kind: 'insight' },
      { label: 'Exam IA-1 item analysis', kind: 'insight' },
    ],
  },
];

@Injectable()
export class TrustCardsService {
  private readonly store = new Map<string, TrustCardCore>(
    PILOT_TRUST_CARDS.map((card) => [card.id, card]),
  );

  constructor(private readonly explainability: ExplainabilityService) {}

  getById(id: string): TrustCard {
    const card = this.store.get(id);
    if (!card) {
      throw new NotFoundException({
        code: 'TRUST_CARD_NOT_FOUND',
        message: 'Trust Card not found for this artifact',
      });
    }

    return {
      ...card,
      auditTrail: this.explainability.getAuditTrail(id),
    };
  }

  createForPaperGeneration(
    options: {
      courseCode?: string;
      examType?: string;
      syllabusSources?: Array<{ label: string; kind: 'syllabus' }>;
    } = {},
  ): TrustCard {
    const syllabusSources = options.syllabusSources ?? [];
    const courseCode = options.courseCode ?? 'BCS304';
    const examType = options.examType ?? 'SEE';

    const sources =
      syllabusSources.length > 0
        ? [
            { label: `Pattern profile VTU/${courseCode} v3`, kind: 'pattern_profile' as const },
            ...syllabusSources,
            { label: `Blueprint ${examType} 2026`, kind: 'other' as const },
          ]
        : [
            { label: `Pattern profile VTU/${courseCode} v3`, kind: 'pattern_profile' as const },
            { label: 'Syllabus module 1–3', kind: 'syllabus' as const },
            { label: `Blueprint ${examType} 2026`, kind: 'other' as const },
          ];

    const core: TrustCardCore = {
      id: randomUUID(),
      artifactType: 'question_paper',
      artifactLabel: `Generated ${examType} paper · ${courseCode}`,
      modelName: 'qwen2.5-14b · local',
      promptVersion: 'qp_gen v14',
      confidence: 0.84,
      blueprintCheckStatus: 'pass',
      verified: true,
      sources,
    };

    this.store.set(core.id, core);

    return {
      ...core,
      auditTrail: [],
    };
  }

  createForAnswerKey(
    options: {
      courseCode?: string;
      examType?: string;
      questionKey?: string;
    } = {},
  ): TrustCard {
    const courseCode = options.courseCode ?? 'BCS304';
    const examType = options.examType ?? 'SEE';
    const questionKey = options.questionKey ?? 'Q1a';

    const core: TrustCardCore = {
      id: randomUUID(),
      artifactType: 'answer_key',
      artifactLabel: `Answer key · ${questionKey} · ${courseCode} ${examType}`,
      modelName: 'qwen2.5-14b · local',
      promptVersion: 'answer_key v9',
      confidence: 0.83,
      blueprintCheckStatus: 'pass',
      verified: true,
      sources: [
        { label: `Generated paper · ${courseCode}`, kind: 'syllabus' as const },
        { label: 'Approved rubric template', kind: 'other' as const },
        { label: 'Syllabus module alignment', kind: 'syllabus' as const },
      ],
    };

    this.store.set(core.id, core);

    return {
      ...core,
      auditTrail: [],
    };
  }

  createForSheetEvaluation(
    options: {
      courseCode?: string;
      examType?: string;
      usn?: string;
      questionKey?: string;
    } = {},
  ): TrustCard {
    const courseCode = options.courseCode ?? 'BCS304';
    const examType = options.examType ?? 'IA-2';
    const usn = options.usn ?? 'PES1UG23CS000';
    const questionKey = options.questionKey;

    const core: TrustCardCore = {
      id: randomUUID(),
      artifactType: 'evaluation',
      artifactLabel: questionKey
        ? `Sheet eval · ${usn} · ${questionKey}`
        : `Answer sheet eval · ${usn}`,
      modelName: 'qwen2.5-14b · local',
      promptVersion: 'eval_rubric v6',
      confidence: 0.81,
      blueprintCheckStatus: 'pass',
      verified: true,
      sources: [
        { label: `Approved rubric · ${courseCode} ${examType}`, kind: 'other' as const },
        { label: 'Scanned sheet pages', kind: 'evaluation' as const },
      ],
    };

    this.store.set(core.id, core);

    return {
      ...core,
      auditTrail: [],
    };
  }
}
