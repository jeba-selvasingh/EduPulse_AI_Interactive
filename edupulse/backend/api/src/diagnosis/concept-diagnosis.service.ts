import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { computeCoMastery } from '../marks/mastery-heatmap.util';
import { MarksStoreService } from '../marks/marks-store.service';
import { PILOT_BCS304_IA2_CO_MAPPING } from '../marks/pilot-bcs304-ia2-co-mapping.seed';
import type { ConceptDiagnosisMap, ConceptMastery } from './concept-diagnosis.schema';
import {
  bandForMastery,
  buildBloomStripCaption,
  buildExamEvidenceRoute,
  isWeakMastery,
} from './concept-diagnosis.util';
import { resolveDiagnosisUsn } from './diagnosis-scope.util';
import {
  DEV_STUDENT_EMAIL,
  PILOT_ACADEMIC_SUBJECTS,
  PILOT_STUDENT_NAME,
} from './pilot-student-academic-level.seed';
import {
  BCS304_CONCEPT_LABELS,
  BCS304_QUESTION_BLOOM,
  PILOT_CONCEPT_MAP_BY_COURSE,
  type PilotSubjectConceptSeed,
} from './pilot-concept-diagnosis.seed';

const DEFAULT_EXAM_TYPE = 'IA-2';

@Injectable()
export class ConceptDiagnosisService {
  constructor(
    private readonly marksStore: MarksStoreService,
    private readonly cohort: CohortService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getMap(
    user: AuthUser,
    courseCode: string,
    options: { usn?: string; examType?: string; coTag?: string },
  ): ConceptDiagnosisMap {
    const started = Date.now();
    const examType = options.examType ?? DEFAULT_EXAM_TYPE;
    const usn = resolveDiagnosisUsn(user, options.usn);
    const studentName = this.resolveStudentName(user.institutionId, usn, user);
    const courseName =
      PILOT_ACADEMIC_SUBJECTS.find((subject) => subject.courseCode === courseCode)?.courseName ??
      courseCode;

    const map =
      courseCode === 'BCS304'
        ? this.buildBcs304Map(user.institutionId, usn, studentName, courseName, examType, options.coTag)
        : this.buildSeededMap(usn, studentName, courseCode, courseName, examType, options.coTag);

    this.actionLogger.logAction({
      action: LogAction.DiagnosisConceptMapView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        usn,
        weakConceptCount: map.concepts.filter((concept) => concept.isWeak).length,
        focusCoTag: options.coTag ?? null,
      },
    });

    return map;
  }

  private buildSeededMap(
    usn: string,
    studentName: string,
    courseCode: string,
    courseName: string,
    examType: string,
    focusCoTag?: string,
  ): ConceptDiagnosisMap {
    const seed = PILOT_CONCEPT_MAP_BY_COURSE[courseCode];
    if (!seed) {
      throw new NotFoundException({
        code: 'CONCEPT_MAP_NOT_FOUND',
        message: `Concept diagnosis is not available for ${courseCode}`,
      });
    }

    const concepts = seed.concepts.map((concept) => this.toConceptMastery(concept));
    const weakest = [...concepts].sort(
      (left, right) => (left.masteryPercent ?? 100) - (right.masteryPercent ?? 100),
    )[0];

    const aiDiagnosis = weakest?.isWeak
      ? {
          ...seed.aiDiagnosis,
          evidenceRefs: [
            weakest.evidence ?? `${weakest.name} below 40%`,
            ...seed.aiDiagnosis.evidenceRefs,
          ],
        }
      : seed.aiDiagnosis;

    return {
      usn,
      studentName,
      courseCode,
      courseName,
      examType: seed.examType,
      focusCoTag,
      concepts,
      bloomStrip: {
        levels: seed.bloomLevels,
        caption: buildBloomStripCaption(seed.bloomLevels),
      },
      aiDiagnosis,
      examEvidenceRoute: buildExamEvidenceRoute(courseCode, seed.examType, usn),
    };
  }

  private buildBcs304Map(
    institutionId: string,
    usn: string,
    studentName: string,
    courseName: string,
    examType: string,
    focusCoTag?: string,
  ): ConceptDiagnosisMap {
    if (!this.marksStore.isPublished(institutionId, 'BCS304', examType)) {
      return this.buildSeededFallbackForBcs304(usn, studentName, courseName, examType, focusCoTag);
    }

    const assessment = this.marksStore.getAssessment(institutionId, 'BCS304', examType);
    if (!assessment) {
      throw new NotFoundException({
        code: 'ASSESSMENT_NOT_FOUND',
        message: 'Published assessment data is unavailable',
      });
    }

    const cells = this.marksStore.getSavedCells(institutionId, 'BCS304', examType);
    const marksByQuestion = new Map<string, number>();
    const questionMax = new Map(assessment.questions.map((question) => [question.id, question.maxMarks]));

    for (const question of assessment.questions) {
      const cell = cells.get(`${usn}:${question.id}`);
      if (cell) {
        marksByQuestion.set(question.id, cell.marks);
      }
    }

    const concepts: ConceptMastery[] = PILOT_BCS304_IA2_CO_MAPPING.map((mapping) => {
      const masteryPercent = computeCoMastery(mapping.contributors, marksByQuestion, questionMax);
      const primaryQuestion = mapping.contributors[0]?.questionId;
      const marks = primaryQuestion ? marksByQuestion.get(primaryQuestion) : undefined;
      const max = primaryQuestion ? questionMax.get(primaryQuestion) : undefined;
      const evidence =
        marks !== undefined && max !== undefined
          ? `IA-2 ${primaryQuestion} · ${BCS304_CONCEPT_LABELS[mapping.coTag] ?? mapping.title} scored ${marks}/${max}`
          : undefined;

      return {
        conceptId: mapping.coTag,
        name: BCS304_CONCEPT_LABELS[mapping.coTag] ?? mapping.title,
        masteryPercent,
        isWeak: isWeakMastery(masteryPercent),
        band: bandForMastery(masteryPercent),
        bloomLevel: primaryQuestion ? BCS304_QUESTION_BLOOM[primaryQuestion] : undefined,
        evidence,
      };
    });

    const bloomLevels = [1, 2, 3, 4, 5, 6].map((level) => {
      const linkedQuestion = Object.entries(BCS304_QUESTION_BLOOM).find(([, bloom]) => bloom === level)?.[0];
      if (!linkedQuestion) {
        return { level, status: 'untested' as const };
      }
      const marks = marksByQuestion.get(linkedQuestion);
      const max = questionMax.get(linkedQuestion) ?? 10;
      if (marks === undefined) {
        return { level, status: 'untested' as const };
      }
      const percent = Math.round((marks / max) * 100);
      return { level, status: percent >= 70 ? ('pass' as const) : ('fail' as const) };
    });

    const focusConcept =
      (focusCoTag ? concepts.find((concept) => concept.conceptId === focusCoTag) : undefined) ??
      [...concepts]
        .filter((concept) => concept.masteryPercent !== null)
        .sort((left, right) => (left.masteryPercent ?? 100) - (right.masteryPercent ?? 100))[0];

    const aiDiagnosis = this.buildBcs304AiDiagnosis(focusConcept, concepts, examType);

    return {
      usn,
      studentName,
      courseCode: 'BCS304',
      courseName,
      examType,
      focusCoTag,
      concepts,
      bloomStrip: {
        levels: bloomLevels,
        caption: buildBloomStripCaption(bloomLevels),
      },
      aiDiagnosis,
      examEvidenceRoute: buildExamEvidenceRoute('BCS304', examType, usn),
    };
  }

  private buildSeededFallbackForBcs304(
    usn: string,
    studentName: string,
    courseName: string,
    examType: string,
    focusCoTag?: string,
  ): ConceptDiagnosisMap {
    const concepts: ConceptMastery[] = PILOT_BCS304_IA2_CO_MAPPING.map((mapping) => ({
      conceptId: mapping.coTag,
      name: BCS304_CONCEPT_LABELS[mapping.coTag] ?? mapping.title,
      masteryPercent: null,
      isWeak: false,
      band: 'missing' as const,
      bloomLevel: BCS304_QUESTION_BLOOM[mapping.contributors[0]?.questionId ?? ''] ?? undefined,
      evidence: 'Publish IA-2 marks to unlock live concept mastery',
    }));

    return {
      usn,
      studentName,
      courseCode: 'BCS304',
      courseName,
      examType,
      focusCoTag,
      concepts,
      bloomStrip: {
        levels: [1, 2, 3, 4, 5, 6].map((level) => ({ level, status: 'untested' as const })),
        caption: 'Publish marks to compute Bloom capability',
      },
      aiDiagnosis: {
        summary: `${courseName} concept map will populate once IA-2 marks are published.`,
        evidenceRefs: ['No published assessment evidence yet'],
      },
      examEvidenceRoute: buildExamEvidenceRoute('BCS304', examType, usn),
    };
  }

  private buildBcs304AiDiagnosis(
    focusConcept: ConceptMastery | undefined,
    concepts: ConceptMastery[],
    examType: string,
  ) {
    const weakConcepts = concepts.filter((concept) => concept.isWeak);
    if (!focusConcept || focusConcept.masteryPercent === null) {
      return {
        summary: 'Complete more assessed items to generate a concept-level AI diagnosis.',
        evidenceRefs: [] as string[],
      };
    }

    const evidenceRefs = [
      focusConcept.evidence,
      ...weakConcepts
        .filter((concept) => concept.conceptId !== focusConcept.conceptId && concept.evidence)
        .map((concept) => concept.evidence as string),
    ].filter((entry): entry is string => Boolean(entry));

    const gapLabel =
      (focusConcept.bloomLevel ?? 3) >= 3 ? 'apply-level gap' : 'foundational recall gap';

    return {
      summary: `${focusConcept.name} at ${focusConcept.masteryPercent}% — ${gapLabel}, not a pure knowledge gap. Review ${examType} rubric feedback for targeted practice.`,
      evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : [`${focusConcept.name} flagged below 40%`],
      trustCardId: weakConcepts.length > 0 ? '10000000-0000-4000-8000-000000000003' : undefined,
    };
  }

  private toConceptMastery(concept: PilotSubjectConceptSeed['concepts'][number]): ConceptMastery {
    return {
      conceptId: concept.conceptId,
      name: concept.name,
      masteryPercent: concept.masteryPercent,
      isWeak: isWeakMastery(concept.masteryPercent),
      band: bandForMastery(concept.masteryPercent),
      bloomLevel: concept.bloomLevel,
      evidence: concept.evidence,
    };
  }

  private resolveStudentName(institutionId: string, usn: string, user: AuthUser): string {
    if (user.roles.includes('student') && user.email === DEV_STUDENT_EMAIL) {
      return PILOT_STUDENT_NAME;
    }

    const roster = this.cohort.getCourseRoster(
      { institutionId, sub: '', email: '', name: '', roles: [] },
      'BCS304',
    );
    return roster.students.find((student) => student.usn === usn)?.name ?? PILOT_STUDENT_NAME;
  }
}
