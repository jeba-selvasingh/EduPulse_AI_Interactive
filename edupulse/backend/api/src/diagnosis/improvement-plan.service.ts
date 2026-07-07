import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { ExplainabilityService } from '../explainability/explainability.service';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { AppRole } from '../rbac/permissions';
import { CohortService } from '../cohort/cohort.service';
import { resolveDiagnosisUsn } from './diagnosis-scope.util';
import type {
  EditImprovementItemInput,
  ImprovementArea,
  ImprovementPlanView,
  PlanMilestone,
} from './improvement-plan.schema';
import { ImprovementPlanStoreService } from './improvement-plan-store.service';
import {
  buildEightWeekPlanRoute,
  buildProgressRoute,
  rankAreas,
} from './improvement-plan.util';
import {
  DEV_STUDENT_EMAIL,
  PILOT_STUDENT_NAME,
} from './pilot-student-academic-level.seed';
import {
  IMPROVEMENT_PLAN_ARTIFACT_ID,
  PILOT_IMPROVEMENT_AREAS,
  PILOT_PLACEMENT_RULES,
  PILOT_PLAN_MILESTONES,
  QUESTION_FOCUS_AREA_MAP,
} from './pilot-improvement-plan.seed';

@Injectable()
export class ImprovementPlanService {
  constructor(
    private readonly store: ImprovementPlanStoreService,
    private readonly cohort: CohortService,
    private readonly explainability: ExplainabilityService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getPlan(
    user: AuthUser,
    options?: { usn?: string; courseCode?: string; questionId?: string; examType?: string },
  ): ImprovementPlanView {
    const started = Date.now();
    const usn = resolveDiagnosisUsn(user, options?.usn);
    const studentName = this.resolveStudentName(user.institutionId, usn, user);
    const focusItemId = options?.questionId
      ? QUESTION_FOCUS_AREA_MAP[options.questionId]
      : undefined;

    const rankedAreas = this.buildRankedAreas(user.institutionId, usn, focusItemId);
    const milestones = this.buildMilestones(user.institutionId, usn);

    const view: ImprovementPlanView = {
      usn,
      studentName,
      focusQuestionId: options?.questionId,
      courseCode: options?.courseCode,
      rankedAreas,
      rankCaption: 'Ranked by impact on attainment + placement eligibility',
      milestones,
      completionPercent: 31,
      currentWeekLabel: 'Week 3 of 8',
      eightWeekPlanRoute: buildEightWeekPlanRoute(usn, options?.courseCode),
      progressRoute: buildProgressRoute(usn),
      placementInsight: `Dream tier reachable by Sem 6 if ${PILOT_PLACEMENT_RULES.dreamTierGapComponent} score crosses 7/10 · ${PILOT_PLACEMENT_RULES.currentCompaniesEligible} companies eligible today`,
    };

    this.actionLogger.logAction({
      action: LogAction.DiagnosisImprovementPlanView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        usn,
        areaCount: rankedAreas.length,
        focusQuestionId: options?.questionId,
        focusedArea: rankedAreas.find((area) => area.isFocused)?.itemId,
      },
    });

    return view;
  }

  updateItem(
    user: AuthUser,
    itemId: string,
    input: EditImprovementItemInput,
  ): ImprovementPlanView {
    const started = Date.now();
    this.assertFacultyEditor(user);

    const usn = resolveDiagnosisUsn(user, input.usn);
    const area = PILOT_IMPROVEMENT_AREAS.find((entry) => entry.itemId === itemId);
    const milestone = PILOT_PLAN_MILESTONES.find((entry) => entry.itemId === itemId);
    if (!area && !milestone) {
      throw new NotFoundException({
        code: 'IMPROVEMENT_ITEM_NOT_FOUND',
        message: `Improvement item ${itemId} not found`,
      });
    }

    const beforeValue = area?.impactSummary ?? milestone?.description ?? '';
    const editedAt = new Date().toISOString();

    this.store.saveOverride({
      institutionId: user.institutionId,
      usn,
      itemId,
      description: input.description,
      facultyId: user.sub,
      facultyName: user.name,
      editedAt,
    });

    this.explainability.appendAuditEvent(user, {
      artifactId: IMPROVEMENT_PLAN_ARTIFACT_ID,
      eventType: 'edit',
      summary: `Faculty updated improvement plan item for ${usn}`,
      field: itemId,
      beforeValue,
      afterValue: input.description,
    });

    this.actionLogger.logAction({
      action: LogAction.DiagnosisImprovementPlanEdit,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { usn, itemId },
    });

    return this.getPlan(user, { usn });
  }

  private buildRankedAreas(
    institutionId: string,
    usn: string,
    focusItemId?: string,
  ): ImprovementArea[] {
    const ranked = rankAreas(PILOT_IMPROVEMENT_AREAS, focusItemId);
    return ranked.map((area) => this.applyOverride(institutionId, usn, area));
  }

  private buildMilestones(institutionId: string, usn: string): PlanMilestone[] {
    return PILOT_PLAN_MILESTONES.map((milestone) => {
      const override = this.store.getOverride(institutionId, usn, milestone.itemId);
      if (!override) return milestone;

      return {
        ...milestone,
        description: override.description,
        facultyAttribution: {
          facultyName: override.facultyName,
          editedAt: override.editedAt,
          description: override.description,
        },
      };
    });
  }

  private applyOverride(
    institutionId: string,
    usn: string,
    area: ImprovementArea,
  ): ImprovementArea {
    const override = this.store.getOverride(institutionId, usn, area.itemId);
    if (!override) return area;

    return {
      ...area,
      impactSummary: override.description,
      facultyAttribution: {
        facultyName: override.facultyName,
        editedAt: override.editedAt,
        description: override.description,
      },
    };
  }

  private assertFacultyEditor(user: AuthUser): void {
    const allowed =
      user.roles.includes(AppRole.Faculty) ||
      user.roles.includes(AppRole.Admin) ||
      user.roles.includes(AppRole.Principal);

    if (!allowed) {
      throw new ForbiddenException({
        code: 'FACULTY_EDIT_ONLY',
        message: 'Only faculty can edit improvement plan items',
      });
    }
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
