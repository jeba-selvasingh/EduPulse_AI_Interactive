import type { EligibilityRules } from './eligibility-tracker.schema';
import type { RegistrationStatus } from './eligibility-tracker.schema';

export type PilotDriveSeed = {
  driveId: string;
  companyName: string;
  driveDateLabel: string;
  daysUntilDrive: number;
  packageLabel: string;
  rulesSummary: string;
  scheduleNote?: string;
  venue?: string;
  registrationStatus: RegistrationStatus;
  eligibleCount: number;
  registeredCount: number;
  registrationOpensLabel?: string;
  registrationClosesLabel?: string;
  rules: EligibilityRules;
};

/** Prototype-aligned drive calendar (Screen 31) */
export const PILOT_DRIVE_CALENDAR: PilotDriveSeed[] = [
  {
    driveId: 'wipro-turbo',
    companyName: 'Wipro Turbo',
    driveDateLabel: '8 Aug',
    daysUntilDrive: 7,
    packageLabel: '9 LPA',
    rulesSummary: 'CGPA ≥ 8.0 · no backlogs ever · online test + 3 rounds',
    scheduleNote: 'Online test 10am',
    venue: 'Main hall',
    registrationStatus: 'open',
    eligibleCount: 31,
    registeredCount: 31,
    rules: {
      minCgpa: 8.0,
      maxActiveBacklogs: 0,
      maxEverBacklogs: 0,
      minCodingScore: 7,
    },
  },
  {
    driveId: 'tcs-digital',
    companyName: 'TCS Digital',
    driveDateLabel: '14 Aug',
    daysUntilDrive: 13,
    packageLabel: '7+ LPA',
    rulesSummary: 'CGPA ≥ 7.0 · no active backlogs · NQT online + coding + interview',
    registrationStatus: 'open',
    eligibleCount: 142,
    registeredCount: 98,
    registrationClosesLabel: '10 Aug',
    rules: {
      minCgpa: 7.0,
      maxActiveBacklogs: 0,
      minCodingScore: 6,
    },
  },
  {
    driveId: 'infosys-sp',
    companyName: 'Infosys SP',
    driveDateLabel: '20 Aug',
    daysUntilDrive: 19,
    packageLabel: '6.5 LPA',
    rulesSummary: 'CGPA ≥ 6.5 · InfyTQ certification preferred · aptitude + coding',
    registrationStatus: 'registered',
    eligibleCount: 138,
    registeredCount: 89,
    rules: {
      minCgpa: 6.5,
      maxActiveBacklogs: 0,
      preferredCerts: ['InfyTQ'],
    },
  },
  {
    driveId: 'cognizant-genc',
    companyName: 'Cognizant GenC',
    driveDateLabel: '28 Aug',
    daysUntilDrive: 27,
    packageLabel: '4.5–5.5 LPA',
    rulesSummary: 'CGPA ≥ 6.0 · GenC Next 5.5 LPA if CGPA ≥ 7.5',
    registrationStatus: 'upcoming',
    eligibleCount: 143,
    registeredCount: 0,
    registrationOpensLabel: '12 Aug',
    rules: {
      minCgpa: 6.0,
      maxActiveBacklogs: 0,
    },
  },
  {
    driveId: 'accenture',
    companyName: 'Accenture',
    driveDateLabel: '5 Sep',
    daysUntilDrive: 35,
    packageLabel: '4.5 LPA',
    rulesSummary: 'CGPA ≥ 6.0 · cognitive + coding + communication',
    registrationStatus: 'upcoming',
    eligibleCount: 140,
    registeredCount: 0,
    rules: {
      minCgpa: 6.0,
      maxActiveBacklogs: 0,
    },
  },
];
