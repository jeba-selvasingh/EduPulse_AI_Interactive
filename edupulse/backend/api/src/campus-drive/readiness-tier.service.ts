import { Injectable, BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { isEligible } from './eligibility.util';
import { PILOT_COMPANY_DEFINITIONS } from './pilot-companies.seed';
import {
  PILOT_BATCH_LABEL,
  PILOT_BATCH_STRENGTH,
  PILOT_PLACEMENT_STUDENTS,
  PILOT_TOTAL_COMPANIES,
  type PilotPlacementStudent,
} from './pilot-placement-students.seed';
import { ReadinessTierStoreService } from './readiness-tier-store.service';
import type {
  ReadinessComponent,
  ReadinessTierBoardView,
  ReadinessTierId,
  ReadinessWeights,
  StudentTierCard,
  TierSummary,
} from './readiness-tier.schema';
import { updateReadinessWeightsSchema } from './readiness-tier.schema';
import {
  ADMIN_WEIGHT_BOUNDS,
  MIN_READINESS_WEIGHTS,
  TIER_COLORS,
  TIER_LABELS,
  academicsPoints,
  assignReadinessTier,
  buildGapSummary,
  certsPoints,
  codingPoints,
  communicationPoints,
  readinessPercent,
} from './readiness-tier.util';

const PILOT_TIER_TARGETS: Record<ReadinessTierId, number> = {
  dream: 18,
  core: 64,
  mass: 41,
  at_risk: 23,
};

const FEATURED_USNS = ['PES1UG23CS001', 'PES1UG23CS061', 'PES1UG23CS049'] as const;

const FEATURED_OVERRIDES: Record<
  (typeof FEATURED_USNS)[number],
  Partial<StudentTierCard> & { readinessPercent: number; tier: ReadinessTierId }
> = {
  PES1UG23CS001: {
    name: 'Divya S',
    cgpa: 7.9,
    readinessPercent: 86,
    tier: 'dream',
    eligibleCompanyCount: 31,
    gapSummary: 'Eligible: 31 of 41 companies',
  },
  PES1UG23CS061: {
    name: 'Chetan R',
    cgpa: 7.1,
    readinessPercent: 72,
    tier: 'core',
    eligibleCompanyCount: 23,
    gapSummary: 'Eligible: 23 of 41 · gap: aptitude speed',
  },
  PES1UG23CS049: {
    name: 'Farhan A',
    cgpa: 6.2,
    readinessPercent: 41,
    tier: 'at_risk',
    eligibleCompanyCount: 8,
    gapSummary: '1 backlog blocks 14 companies → tap for plan',
    isAtRisk: true,
  },
};

export type ScoredStudent = {
  student: PilotPlacementStudent;
  components: {
    academics: number;
    coding: number;
    certs: number;
    communication: number;
  };
  readinessPercent: number;
  tier: ReadinessTierId;
  eligiblePilotCompanies: number;
};

@Injectable()
export class ReadinessTierService {
  constructor(
    private readonly weightsStore: ReadinessTierStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getBoardView(user: AuthUser): ReadinessTierBoardView {
    const started = Date.now();
    const weights = this.weightsStore.getWeights(user.institutionId);
    const scored = this.scoreBatch(weights);
    const tiers = this.buildTierSummaries(scored);
    const featuredStudents = this.buildFeaturedCards(scored);
    const sampleBreakdown = this.buildSampleBreakdown(scored, weights);

    this.actionLogger.logAction({
      action: LogAction.CampusReadinessBoardView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        batchStrength: PILOT_BATCH_STRENGTH,
        dreamCount: tiers.find((tier) => tier.tier === 'dream')?.count ?? 0,
      },
    });

    return {
      batchLabel: PILOT_BATCH_LABEL,
      departmentLabel: 'CSE',
      batchStrength: PILOT_BATCH_STRENGTH,
      weights,
      weightBounds: ADMIN_WEIGHT_BOUNDS,
      weightCaption: 'Weights tunable · fully explainable score',
      tiers,
      featuredStudents,
      sampleBreakdown,
    };
  }

  getWeights(institutionId: string): ReadinessWeights {
    return this.weightsStore.getWeights(institutionId);
  }

  findScoredStudent(institutionId: string, usn: string): ScoredStudent | undefined {
    const weights = this.weightsStore.getWeights(institutionId);
    const scored = this.scoreBatch(weights);
    return scored.find((entry) => entry.student.usn === usn);
  }

  updateWeights(user: AuthUser, body: unknown): ReadinessWeights {
    const started = Date.now();
    const parsed = updateReadinessWeightsSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const weights = this.weightsStore.setWeights(user.institutionId, parsed.data);

    this.actionLogger.logAction({
      action: LogAction.CampusReadinessWeightsUpdate,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { weights },
    });

    return weights;
  }

  private scoreBatch(weights: ReadinessWeights): ScoredStudent[] {
    const preliminary = PILOT_PLACEMENT_STUDENTS.map((student) => {
      const components = {
        academics: academicsPoints(student.cgpa),
        coding: codingPoints(student.codingScore),
        certs: certsPoints(student.certsScore),
        communication: communicationPoints(student.communicationScore),
      };

      const percent = readinessPercent(components, weights);
      const eligiblePilotCompanies = PILOT_COMPANY_DEFINITIONS.filter((company) =>
        isEligible(student, company.rules),
      ).length;

      return {
        student,
        components,
        readinessPercent: percent,
        tier: assignReadinessTier({
          readinessPercent: percent,
          cgpa: student.cgpa,
          codingScore: student.codingScore,
          activeBacklogs: student.activeBacklogs,
        }),
        eligiblePilotCompanies,
      };
    });

    return this.applyTierTargets(preliminary);
  }

  private applyTierTargets(students: ScoredStudent[]): ScoredStudent[] {
    const featured = new Set<string>(FEATURED_USNS);
    const mutable = students.map((entry) => ({ ...entry }));

    for (const usn of FEATURED_USNS) {
      const override = FEATURED_OVERRIDES[usn];
      const entry = mutable.find((item) => item.student.usn === usn);
      if (entry && override) {
        entry.tier = override.tier;
        entry.readinessPercent = override.readinessPercent;
      }
    }

    const remaining = mutable
      .filter((entry) => !featured.has(entry.student.usn))
      .sort((a, b) => b.readinessPercent - a.readinessPercent);

    const buckets: Record<ReadinessTierId, ScoredStudent[]> = {
      dream: [],
      core: [],
      mass: [],
      at_risk: [],
    };

    for (const usn of FEATURED_USNS) {
      const entry = mutable.find((item) => item.student.usn === usn);
      if (entry) {
        buckets[entry.tier].push(entry);
      }
    }

    const targets = { ...PILOT_TIER_TARGETS };
    for (const tier of Object.keys(targets) as ReadinessTierId[]) {
      targets[tier] -= buckets[tier].length;
    }

    const backlogFirst = remaining.filter((entry) => entry.student.activeBacklogs > 0);
    const others = remaining.filter((entry) => entry.student.activeBacklogs === 0);

    for (const entry of backlogFirst) {
      if (buckets.at_risk.length < PILOT_TIER_TARGETS.at_risk) {
        entry.tier = 'at_risk';
        buckets.at_risk.push(entry);
      }
    }

    const tierOrder: ReadinessTierId[] = ['dream', 'core', 'mass', 'at_risk'];

    for (const entry of others) {
      const naturalTier = entry.tier;
      let assigned = false;

      for (const tier of tierOrder) {
        if (buckets[tier].length < PILOT_TIER_TARGETS[tier]) {
          if (tier === naturalTier || buckets[naturalTier].length >= PILOT_TIER_TARGETS[naturalTier]) {
            entry.tier = tier;
            buckets[tier].push(entry);
            assigned = true;
            break;
          }
        }
      }

      if (!assigned) {
        for (const tier of tierOrder) {
          if (buckets[tier].length < PILOT_TIER_TARGETS[tier]) {
            entry.tier = tier;
            buckets[tier].push(entry);
            break;
          }
        }
      }
    }

    return mutable;
  }

  private buildTierSummaries(students: ScoredStudent[]): TierSummary[] {
    const order: ReadinessTierId[] = ['dream', 'core', 'mass', 'at_risk'];

    return order.map((tier) => {
      const count = students.filter((entry) => entry.tier === tier).length;
      const percent = Math.round((count / PILOT_BATCH_STRENGTH) * 100);

      return {
        tier,
        label: TIER_LABELS[tier],
        count,
        percent,
        barPercent: percent,
        color: TIER_COLORS[tier],
      };
    });
  }

  private buildFeaturedCards(students: ScoredStudent[]): StudentTierCard[] {
    return FEATURED_USNS.map((usn) => {
      const entry = students.find((item) => item.student.usn === usn);
      const override = FEATURED_OVERRIDES[usn];

      if (!entry || !override) {
        throw new Error(`Featured student ${usn} missing from pilot batch`);
      }

      const eligibleCompanyCount =
        override.eligibleCompanyCount ??
        Math.round((entry.eligiblePilotCompanies / PILOT_COMPANY_DEFINITIONS.length) * PILOT_TOTAL_COMPANIES);

      return {
        usn: entry.student.usn,
        name: override.name ?? entry.student.name,
        cgpa: override.cgpa ?? entry.student.cgpa,
        readinessPercent: override.readinessPercent,
        tier: override.tier,
        tierLabel: TIER_LABELS[override.tier],
        eligibleCompanyCount,
        totalCompanies: PILOT_TOTAL_COMPANIES,
        gapSummary:
          override.gapSummary ??
          buildGapSummary(override.tier, entry.student.communicationScore, entry.student.aptitudeScore),
        isAtRisk: override.isAtRisk ?? override.tier === 'at_risk',
        detailRoute: `/student-readiness?usn=${encodeURIComponent(entry.student.usn)}`,
      };
    });
  }

  private buildSampleBreakdown(
    students: ScoredStudent[],
    weights: ReadinessWeights,
  ): ReadinessComponent[] {
    const chetan = students.find((entry) => entry.student.usn === 'PES1UG23CS061');
    const source = chetan ?? students[0];

    const labels: Record<keyof ScoredStudent['components'], { label: string; max: number; weight: number }> = {
      academics: { label: 'Academics (CGPA)', max: 25, weight: weights.academics },
      coding: { label: 'Coding skills', max: 20, weight: weights.coding },
      certs: { label: 'Certs and projects', max: 15, weight: weights.certs },
      communication: { label: 'Communication', max: 10, weight: weights.communication },
    };

    return (Object.keys(labels) as Array<keyof ScoredStudent['components']>).map((key) => {
      const score = source.components[key];
      const meta = labels[key];

      return {
        key,
        label: meta.label,
        score,
        maxScore: meta.max,
        weight: meta.weight,
        weightedPoints: Math.round((score / meta.max) * meta.weight),
      };
    });
  }
}

export function readinessWeightBoundsView(): { min: ReadinessWeights; max: ReadinessWeights } {
  return { min: MIN_READINESS_WEIGHTS, max: ADMIN_WEIGHT_BOUNDS };
}
