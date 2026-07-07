import type {
  CompaniesEligibilityDelta,
  ConceptDelta,
  ReadinessPoint,
} from './progress-tracking.schema';

export const PILOT_READINESS_POINTS: Omit<ReadinessPoint, 'barHeightPercent'>[] = [
  { label: 'Sem 3', sublabel: '54', score: 54, color: '#F09595' },
  { label: 'Sem 4', sublabel: '61', score: 61, color: '#FAC775' },
  { label: 'IA-1', sublabel: '67', score: 67, color: '#85B7EB' },
  { label: 'Now', sublabel: '72', score: 72, color: '#534AB7' },
];

export const PILOT_CONCEPT_DELTAS: ConceptDelta[] = [
  {
    conceptName: 'DBMS normalization',
    fromScore: 38,
    toScore: 64,
    trend: 'up',
    deltaLabel: '38 → 64 ↑',
  },
  {
    conceptName: 'Networks mastery',
    fromScore: 41,
    toScore: 45,
    trend: 'stable',
    deltaLabel: '41 → 45 →',
  },
];

export const PILOT_COMPANIES_ELIGIBILITY: CompaniesEligibilityDelta = {
  fromCount: 23,
  toCount: 29,
  trend: 'up',
  deltaLabel: '23 → 29 ↑',
};

export const PILOT_PROGRESS_PROJECTION = {
  summary:
    'Dream tier reachable by Sem 6 if communication score crosses 7/10. Retest scheduled wk 8.',
  assumptions: [
    'Assumes communication readiness crosses 7/10 by end of plan week 8',
    'Company eligibility based on current placement rule thresholds',
    'Concept deltas use latest published IA marks vs plan start baseline',
  ],
};
