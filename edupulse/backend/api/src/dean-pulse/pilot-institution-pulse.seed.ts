import type { InstitutionPulseView } from './institution-pulse.schema';

/** Prototype screen 11 — institution pulse */
export const PILOT_INSTITUTION_PULSE: InstitutionPulseView = {
  predictedPlacementPct: 78,
  atRiskCount: 23,
  readinessByDepartment: [
    { department: 'CSE', readinessScore: 82, barPercent: 82, color: '#534AB7' },
    { department: 'ECE', readinessScore: 74, barPercent: 74, color: '#AFA9EC' },
    { department: 'MEC', readinessScore: 61, barPercent: 61, color: '#CECBF6' },
    { department: 'CIV', readinessScore: 57, barPercent: 57, color: '#CECBF6' },
  ],
  accreditationWatch: {
    title: 'Accreditation watch',
    summary: 'CO4 trailing in 3 courses · NBA visit in 8 months',
    items: ['CO4 trailing in 3 courses', 'NBA visit in 8 months'],
  },
  weekSummary: {
    papersGenerated: 34,
    hoursSaved: 61,
    studentsRecovered: 6,
  },
  weekOverWeek: {
    placementPctDelta: 3,
    atRiskDelta: -4,
  },
};
