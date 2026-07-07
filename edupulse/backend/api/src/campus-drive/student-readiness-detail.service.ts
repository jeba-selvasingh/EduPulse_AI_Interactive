import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { PILOT_COMPANY_DEFINITIONS } from './pilot-companies.seed';
import { PILOT_BATCH_LABEL, PILOT_TOTAL_COMPANIES } from './pilot-placement-students.seed';
import type {
  ReadinessComponent,
  ReadinessTierId,
  ReadinessWeights,
} from './readiness-tier.schema';
import { TIER_LABELS } from './readiness-tier.util';
import { ReadinessTierService } from './readiness-tier.service';
import type {
  InterventionModuleLink,
  StudentReadinessDetailView,
} from './student-readiness-detail.schema';

type DetailOverride = {
  readinessPercent?: number;
  tier?: ReadinessTierId;
  displayCgpa?: number;
  eligibleCompanyCount?: number;
  trendLabel?: string;
  companyFitSummary?: string;
  gapAnalysis?: string;
  gapPlanTitle?: string;
  gapPlanSummary?: string;
  breakdownScores?: {
    academics: number;
    coding: number;
    certs: number;
    communication: number;
  };
  interventionModules?: InterventionModuleLink[];
};

const DETAIL_OVERRIDES: Record<string, DetailOverride> = {
  PES1UG23CS001: {
    readinessPercent: 86,
    tier: 'dream',
    displayCgpa: 7.9,
    eligibleCompanyCount: 31,
    trendLabel: 'Trend: improving ↑ since sem 3',
    companyFitSummary: 'Eligible: 31 of 41 companies',
    gapAnalysis: 'On track for dream recruiters · maintain coding practice',
    gapPlanTitle: '8-week stretch plan',
    gapPlanSummary: 'Advanced DSA Tue/Thu · 2 mock interviews · InfyTQ refresh',
    breakdownScores: { academics: 22, coding: 17, certs: 14, communication: 9 },
    interventionModules: [
      {
        id: 'mock-interviews',
        label: 'Dream-company mock interviews',
        route: '/training-dashboards?track=technical',
        priority: 'medium',
      },
      {
        id: 'company-tracker',
        label: 'Review company eligibility tracker',
        route: '/company-eligibility',
        priority: 'quick_win',
      },
    ],
  },
  PES1UG23CS061: {
    readinessPercent: 72,
    tier: 'core',
    displayCgpa: 7.1,
    eligibleCompanyCount: 23,
    trendLabel: 'Trend: improving ↑ since sem 4',
    companyFitSummary: '↑ Raising aptitude unlocks 6 more companies',
    gapAnalysis: 'Gap: aptitude speed · communication below batch median',
    gapPlanTitle: '10-week gap plan',
    gapPlanSummary: 'Soft-skills lab Tue/Thu · 2 mock GDs · aptitude sprint wk 3–6',
    breakdownScores: { academics: 19, coding: 13, certs: 11, communication: 4 },
    interventionModules: [
      {
        id: 'soft-skills',
        label: 'Communication crash course',
        route: '/training-dashboards?track=soft-skills',
        priority: 'high',
      },
      {
        id: 'aptitude-sprint',
        label: 'Quantitative aptitude sprint',
        route: '/training-dashboards?track=aptitude',
        priority: 'medium',
      },
      {
        id: 'intervention-list',
        label: 'View intervention priority list',
        route: '/intervention-priority',
        priority: 'medium',
      },
    ],
  },
  PES1UG23CS049: {
    readinessPercent: 41,
    tier: 'at_risk',
    displayCgpa: 6.2,
    eligibleCompanyCount: 8,
    trendLabel: 'Trend: needs attention ↓ backlog risk',
    companyFitSummary: '1 backlog blocks 14 companies',
    gapAnalysis: 'Active backlog is the primary placement blocker',
    gapPlanTitle: 'Recovery plan',
    gapPlanSummary: 'Clear backlog by supplementary exam 22 Aug · counselling booked',
    breakdownScores: { academics: 12, coding: 9, certs: 6, communication: 4 },
    interventionModules: [
      {
        id: 'backlog-clearance',
        label: 'Clear backlogs · urgent',
        route: '/intervention-priority?focus=backlog',
        priority: 'urgent',
      },
      {
        id: 'aptitude-sprint',
        label: 'Foundation aptitude sprint',
        route: '/training-dashboards?track=aptitude',
        priority: 'medium',
      },
    ],
  },
};

@Injectable()
export class StudentReadinessDetailService {
  constructor(
    private readonly readinessTier: ReadinessTierService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getDetail(user: AuthUser, usn: string): StudentReadinessDetailView {
    const started = Date.now();
    const normalizedUsn = usn.trim();

    if (!normalizedUsn) {
      throw new BadRequestException('USN query parameter is required');
    }

    const scored = this.readinessTier.findScoredStudent(user.institutionId, normalizedUsn);

    if (!scored) {
      throw new NotFoundException(`Student ${normalizedUsn} not found in pilot batch`);
    }

    const override = DETAIL_OVERRIDES[normalizedUsn];
    const weights = this.readinessTier.getWeights(user.institutionId);
    const components = override?.breakdownScores ?? scored.components;
    const displayCgpa = override?.displayCgpa ?? scored.student.cgpa;
    const breakdown = this.buildBreakdown(components, weights, displayCgpa);
    const tier = override?.tier ?? scored.tier;
    const readinessPercent = override?.readinessPercent ?? scored.readinessPercent;
    const eligibleCompanyCount =
      override?.eligibleCompanyCount ??
      Math.round(
        (scored.eligiblePilotCompanies / PILOT_COMPANY_DEFINITIONS.length) * PILOT_TOTAL_COMPANIES,
      );

    const view: StudentReadinessDetailView = {
      usn: scored.student.usn,
      name: scored.student.name,
      departmentLabel: 'CSE',
      batchLabel: PILOT_BATCH_LABEL,
      readinessPercent,
      tier,
      tierLabel: TIER_LABELS[tier],
      trendLabel: override?.trendLabel ?? this.defaultTrendLabel(tier),
      breakdown,
      eligibleCompanyCount,
      totalCompanies: PILOT_TOTAL_COMPANIES,
      companyFitSummary:
        override?.companyFitSummary ??
        `${eligibleCompanyCount} of ${PILOT_TOTAL_COMPANIES} companies eligible`,
      gapAnalysis: override?.gapAnalysis ?? this.defaultGapAnalysis(scored),
      gapPlanTitle: override?.gapPlanTitle ?? '10-week gap plan',
      gapPlanSummary: override?.gapPlanSummary ?? this.defaultGapPlan(scored),
      interventionModules: override?.interventionModules ?? this.defaultInterventions(scored),
      evaluationRoute: '/batch-evaluation',
    };

    this.actionLogger.logAction({
      action: LogAction.CampusStudentReadinessView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { usn: normalizedUsn, tier, readinessPercent },
    });

    return view;
  }

  private buildBreakdown(
    components: {
      academics: number;
      coding: number;
      certs: number;
      communication: number;
    },
    weights: ReadinessWeights,
    cgpa: number,
  ): ReadinessComponent[] {
    const labels: Record<keyof typeof components, { label: string; max: number; weightKey: keyof typeof weights }> = {
      academics: { label: `Academics (CGPA ${cgpa.toFixed(1)})`, max: 25, weightKey: 'academics' },
      coding: { label: 'Coding skills', max: 20, weightKey: 'coding' },
      certs: { label: 'Certs and projects', max: 15, weightKey: 'certs' },
      communication: { label: 'Communication', max: 10, weightKey: 'communication' },
    };

    return (Object.keys(labels) as Array<keyof typeof components>).map((key) => {
      const score = components[key];
      const meta = labels[key];
      const weight = weights[meta.weightKey];

      return {
        key,
        label: meta.label,
        score,
        maxScore: meta.max,
        weight,
        weightedPoints: Math.round((score / meta.max) * weight),
      };
    });
  }

  private defaultTrendLabel(tier: ReadinessTierId): string {
    if (tier === 'dream') {
      return 'Trend: improving ↑ since sem 3';
    }
    if (tier === 'at_risk') {
      return 'Trend: needs attention ↓ placement risk';
    }
    return 'Trend: improving ↑ since sem 4';
  }

  private defaultGapAnalysis(
    scored: NonNullable<ReturnType<ReadinessTierService['findScoredStudent']>>,
  ): string {
    if (scored.student.activeBacklogs > 0) {
      return 'Active backlog is blocking multiple company drives';
    }
    if (scored.student.communicationScore < 5) {
      return 'Gap: communication skills';
    }
    if (scored.student.aptitudeScore < 7) {
      return 'Gap: aptitude speed';
    }
    return 'Minor gaps remain · focus on mock tests';
  }

  private defaultGapPlan(
    scored: NonNullable<ReturnType<ReadinessTierService['findScoredStudent']>>,
  ): string {
    if (scored.student.activeBacklogs > 0) {
      return 'Clear backlog first · then aptitude foundation sprint';
    }
    if (scored.student.communicationScore < 5) {
      return 'Soft-skills lab Tue/Thu · 2 mock GDs · aptitude sprint wk 3–6';
    }
    return 'Weekly mock tests · coding practice · certification refresh';
  }

  private defaultInterventions(
    scored: NonNullable<ReturnType<ReadinessTierService['findScoredStudent']>>,
  ): InterventionModuleLink[] {
    const modules: InterventionModuleLink[] = [];

    if (scored.student.activeBacklogs > 0) {
      modules.push({
        id: 'backlog-clearance',
        label: 'Clear backlogs · urgent',
        route: '/intervention-priority?focus=backlog',
        priority: 'urgent',
      });
    }

    if (scored.student.communicationScore < 6) {
      modules.push({
        id: 'soft-skills',
        label: 'Communication crash course',
        route: '/training-dashboards?track=soft-skills',
        priority: 'high',
      });
    }

    if (scored.student.aptitudeScore < 7) {
      modules.push({
        id: 'aptitude-sprint',
        label: 'Quantitative aptitude sprint',
        route: '/training-dashboards?track=aptitude',
        priority: 'medium',
      });
    }

    modules.push({
      id: 'intervention-list',
      label: 'View intervention priority list',
      route: '/intervention-priority',
      priority: 'medium',
    });

    return modules;
  }
}
