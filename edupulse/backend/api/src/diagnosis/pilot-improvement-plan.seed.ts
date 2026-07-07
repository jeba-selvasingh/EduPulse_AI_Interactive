import type { ImprovementArea, PlanMilestone } from './improvement-plan.schema';

export const IMPROVEMENT_PLAN_ARTIFACT_ID = '10000000-0000-4000-8000-000000000010';

export const PILOT_PLACEMENT_RULES = {
  coreTierMinReadiness: 60,
  dreamTierMinReadiness: 72,
  companiesAtRiskThreshold: 14,
  currentCompaniesEligible: 29,
  dreamTierGapComponent: 'communication',
};

export const PILOT_IMPROVEMENT_AREAS: Omit<ImprovementArea, 'rank' | 'isFocused' | 'facultyAttribution'>[] = [
  {
    itemId: 'dbms-normalization',
    title: 'DBMS normalization',
    priority: 'high',
    impactSummary:
      'Blocks CO3 attainment · appears in SEE Part C 80% of years (pattern intelligence)',
    coTagsAffected: ['CO3'],
    companiesImpact: 14,
    impactScore: 120,
  },
  {
    itemId: 'networks-fundamentals',
    title: 'Networks fundamentals',
    priority: 'high',
    impactSummary: 'Declining 3 assessments in a row · risks backlog blocking 14 companies',
    coTagsAffected: ['CO2', 'CO4'],
    companiesImpact: 14,
    impactScore: 110,
  },
  {
    itemId: 'communication-skills',
    title: 'Communication skills',
    priority: 'medium',
    impactSummary: 'Lowest readiness component (4/10) · main gap between Core and Dream tier',
    impactScore: 75,
  },
  {
    itemId: 'aptitude-speed',
    title: 'Aptitude speed',
    priority: 'watch',
    impactSummary: 'Accuracy fine, timing 20% over benchmark in mocks',
    impactScore: 40,
  },
];

export const PILOT_PLAN_MILESTONES: Omit<PlanMilestone, 'facultyAttribution'>[] = [
  {
    itemId: 'milestone-wk1-2',
    weekLabel: 'Wk 1–2',
    title: 'FD basics refresher',
    status: 'done',
    description: 'NPTEL DBMS wk-6 videos + 10 FD exercises · quiz 8/10',
  },
  {
    itemId: 'milestone-wk3-4',
    weekLabel: 'Wk 3–4',
    title: '3NF decomposition drill',
    status: 'now',
    description:
      '15 schema problems · faculty check-in Friday · practice set from past SEE questions',
  },
  {
    itemId: 'milestone-wk5-6',
    weekLabel: 'Wk 5–6',
    title: 'Networks recovery',
    status: 'next',
    description: 'OSI/TCP drills · past IA retest set · weekly mock quiz',
  },
  {
    itemId: 'milestone-wk7-8',
    weekLabel: 'Wk 7–8',
    title: 'Mock GD + retest',
    status: 'next',
    description: 'Communication lab sessions · IA-3 retest · placement readiness check',
  },
];

export const QUESTION_FOCUS_AREA_MAP: Record<string, string> = {
  Q2: 'dbms-normalization',
  Q1: 'dbms-normalization',
};
