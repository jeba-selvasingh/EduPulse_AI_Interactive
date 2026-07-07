import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CohortService } from '../cohort/cohort.service';
import { EvaluationStoreService } from '../evaluation/evaluation-store.service';
import { getPilotBcs304Ia2Rubric } from '../evaluation/pilot-bcs304-ia2-rubric.seed';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { MarksStoreService } from '../marks/marks-store.service';
import { BCS304_QUESTION_BLOOM } from './pilot-concept-diagnosis.seed';
import { resolveDiagnosisUsn } from './diagnosis-scope.util';
import type { ExamEvidenceView, ExamQuestionEvidence } from './exam-evidence.schema';
import {
  buildImprovementAreaRoute,
  buildImprovementPlanRoute,
  feedbackFromPercent,
  isWeakQuestion,
  roundAverage,
} from './exam-evidence.util';
import {
  DEV_STUDENT_EMAIL,
  PILOT_ACADEMIC_SUBJECTS,
  PILOT_STUDENT_NAME,
} from './pilot-student-academic-level.seed';
import {
  attachImprovementRoutes,
  PILOT_BCS301_EXAM_EVIDENCE,
} from './pilot-exam-evidence.seed';

const SEEDED_COURSES = new Set(['BCS301']);

@Injectable()
export class ExamEvidenceService {
  constructor(
    private readonly marksStore: MarksStoreService,
    private readonly evaluationStore: EvaluationStoreService,
    private readonly cohort: CohortService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getView(
    user: AuthUser,
    courseCode: string,
    examType: string,
    requestedUsn?: string,
  ): ExamEvidenceView {
    const started = Date.now();
    const usn = resolveDiagnosisUsn(user, requestedUsn);
    const studentName = this.resolveStudentName(user.institutionId, usn, user);
    const courseName =
      PILOT_ACADEMIC_SUBJECTS.find((subject) => subject.courseCode === courseCode)?.courseName ??
      courseCode;

    let view: ExamEvidenceView;

    if (SEEDED_COURSES.has(courseCode)) {
      const seeded = attachImprovementRoutes(
        PILOT_BCS301_EXAM_EVIDENCE,
        usn,
        buildImprovementAreaRoute,
        buildImprovementPlanRoute,
      );
      view = { ...seeded, usn, studentName };
    } else if (courseCode === 'BCS304') {
      view = this.buildBcs304View(user.institutionId, usn, studentName, courseName, examType);
    } else {
      throw new NotFoundException({
        code: 'EXAM_EVIDENCE_NOT_FOUND',
        message: `Exam evidence is not available for ${courseCode}`,
      });
    }

    this.actionLogger.logAction({
      action: LogAction.DiagnosisExamEvidenceView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        usn,
        weakQuestionCount: view.questions.filter((question) => question.isWeak).length,
        isPublished: view.isPublished,
      },
    });

    return view;
  }

  private buildBcs304View(
    institutionId: string,
    usn: string,
    studentName: string,
    courseName: string,
    examType: string,
  ): ExamEvidenceView {
    const isPublished = this.marksStore.isPublished(institutionId, 'BCS304', examType);
    if (!isPublished) {
      throw new BadRequestException({
        code: 'MARKS_NOT_PUBLISHED',
        message: 'Exam evidence is available only after marks are published',
      });
    }

    const assessment = this.marksStore.getAssessment(institutionId, 'BCS304', examType);
    if (!assessment) {
      throw new NotFoundException({
        code: 'ASSESSMENT_NOT_FOUND',
        message: 'Assessment not found',
      });
    }

    const cells = this.marksStore.getSavedCells(institutionId, 'BCS304', examType);
    const roster = this.cohort.getCourseRoster(
      { institutionId, sub: '', email: '', name: '', roles: [] },
      'BCS304',
    );
    const evaluation = this.evaluationStore.getSheetEvaluation(
      institutionId,
      'BCS304',
      examType,
      usn,
    );
    const rubric = getPilotBcs304Ia2Rubric();
    const rubricById = new Map(rubric.map((entry) => [entry.questionId, entry]));

    const questions: ExamQuestionEvidence[] = assessment.questions.map((question) => {
      const rubricEntry = rubricById.get(question.id);
      const topic = rubricEntry?.topic ?? question.id;
      const bloomLevel = BCS304_QUESTION_BLOOM[question.id] ?? 3;
      const studentCell = cells.get(`${usn}:${question.id}`);
      const marksAwarded = studentCell?.marks ?? 0;

      const classMarks = roster.students
        .map((student) => cells.get(`${student.usn}:${question.id}`)?.marks)
        .filter((marks): marks is number => marks !== undefined);
      const classAverageMarks = roundAverage(classMarks);

      const evalQuestion = evaluation?.questions.find((entry) => entry.questionId === question.id);
      const rubricFeedback = feedbackFromPercent(
        question.id,
        topic,
        marksAwarded,
        question.maxMarks,
        evalQuestion?.facultyNote,
        evalQuestion?.rationale,
      );
      const isWeak = isWeakQuestion(marksAwarded, question.maxMarks);

      return {
        questionId: question.id,
        label: `${question.id} · ${this.shortTopic(topic)} · L${bloomLevel}`,
        topic: this.shortTopic(topic),
        bloomLevel,
        marksAwarded,
        maxMarks: question.maxMarks,
        classAverageMarks,
        rubricFeedback,
        isWeak,
        improvementRoute: isWeak
          ? buildImprovementAreaRoute('BCS304', examType, usn, question.id)
          : '',
      };
    });

    const studentTotal = questions.reduce((sum, question) => sum + question.marksAwarded, 0);
    const maxTotalMarks = questions.reduce((sum, question) => sum + question.maxMarks, 0);
    const classAverageTotal = Math.round(
      questions.reduce((sum, question) => sum + question.classAverageMarks, 0),
    );
    const delta = studentTotal - classAverageTotal;
    const weakest = [...questions].sort((left, right) => {
      const leftPct = left.marksAwarded / left.maxMarks;
      const rightPct = right.marksAwarded / right.maxMarks;
      return leftPct - rightPct;
    })[0];

    const insight =
      delta >= 0
        ? `Class average ${classAverageTotal}/${maxTotalMarks} · you are ${delta} above average · maintain strength in ${weakest?.topic ?? 'core topics'}.`
        : `Class average ${classAverageTotal}/${maxTotalMarks} · you are ${Math.abs(delta)} below · single largest loss is ${weakest?.topic.toLowerCase() ?? 'a weak area'} — recoverable with targeted practice.`;

    return {
      usn,
      studentName,
      courseCode: 'BCS304',
      courseName,
      examType,
      isPublished: true,
      totalMarks: studentTotal,
      maxTotalMarks,
      questions,
      summary: {
        classAverageTotal,
        studentTotal,
        maxTotalMarks,
        deltaFromClassAverage: delta,
        insight,
      },
      improvementPlanRoute: buildImprovementPlanRoute('BCS304', usn),
    };
  }

  private shortTopic(topic: string): string {
    if (topic.length <= 42) return topic;
    return `${topic.slice(0, 39)}…`;
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
