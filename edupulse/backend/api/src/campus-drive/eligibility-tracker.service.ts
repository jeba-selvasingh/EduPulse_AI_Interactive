import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { computeEligibilityCounts } from './eligibility.util';
import type {
  CampusHomeView,
  CompanyTier,
  EligibilityTrackerView,
  NearMissInsight,
  TierFilter,
} from './eligibility-tracker.schema';
import { PILOT_COMPANY_DEFINITIONS } from './pilot-companies.seed';
import {
  PILOT_BATCH_LABEL,
  PILOT_BATCH_STRENGTH,
  PILOT_PLACEMENT_STUDENTS,
} from './pilot-placement-students.seed';

@Injectable()
export class EligibilityTrackerService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getHomeView(user: AuthUser): CampusHomeView {
    const eligibility = this.buildTrackerView('all');

    this.actionLogger.logAction({
      action: LogAction.CampusHomeView,
      durationMs: 0,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
    });

    return {
      batchLabel: PILOT_BATCH_LABEL,
      batchStrength: PILOT_BATCH_STRENGTH,
      dreamReadyCount: 18,
      driveDaysLeft: 62,
      offersReceived: 34,
      companyCount: eligibility.totalCompanies,
      scheduledDrives: 23,
      newCompaniesThisMonth: 8,
      eligibilityRoute: '/company-eligibility',
    };
  }

  getTrackerView(user: AuthUser, tierFilter: TierFilter = 'all'): EligibilityTrackerView {
    const started = Date.now();
    const view = this.buildTrackerView(tierFilter);

    this.actionLogger.logAction({
      action: LogAction.CampusEligibilityView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        tierFilter,
        companyCount: view.companies.length,
        nearMissInsights: view.nearMissInsights.length,
      },
    });

    return view;
  }

  private buildTrackerView(tierFilter: TierFilter): EligibilityTrackerView {
    const companies = PILOT_COMPANY_DEFINITIONS.map((company) => {
      const counts = computeEligibilityCounts(PILOT_PLACEMENT_STUDENTS, company.rules);
      return {
        ...company,
        ...counts,
      };
    });

    const filtered =
      tierFilter === 'all'
        ? companies
        : companies.filter((company) => company.tier === tierFilter);

    const nearMissInsights = this.buildNearMissInsights(companies);

    return {
      batchLabel: PILOT_BATCH_LABEL,
      batchStrength: PILOT_BATCH_STRENGTH,
      totalCompanies: companies.length,
      activeTierFilter: tierFilter,
      companies: filtered,
      nearMissInsights,
    };
  }

  private buildNearMissInsights(
    companies: EligibilityTrackerView['companies'],
  ): NearMissInsight[] {
    return companies
      .filter((company) => company.nearMissCount > 0)
      .map((company) => ({
        companyId: company.companyId,
        companyName: company.name,
        nearMissCount: company.nearMissCount,
        cgpaGapLabel: '0.1–0.3 CGPA',
        message: `${company.nearMissCount} students are 0.1–0.3 CGPA away from unlocking ${company.name} — one semester improvement suffices.`,
      }))
      .sort((a, b) => b.nearMissCount - a.nearMissCount);
  }
}

export function parseTierFilter(value?: string): TierFilter {
  if (value === 'dream' || value === 'core_it' || value === 'mass') {
    return value;
  }
  return 'all';
}

export function tierLabel(tier: CompanyTier): string {
  switch (tier) {
    case 'dream':
      return 'Dream';
    case 'core_it':
      return 'Core IT';
    default:
      return 'Mass';
  }
}
