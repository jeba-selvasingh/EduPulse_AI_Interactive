import type { CompanyEligibility, EligibilityRules } from './eligibility-tracker.schema';

export type PilotCompanyDefinition = Omit<
  CompanyEligibility,
  'eligibleCount' | 'notEligibleCount' | 'nearMissCount'
>;

export const PILOT_COMPANY_DEFINITIONS: PilotCompanyDefinition[] = [
  {
    companyId: 'tcs-digital',
    name: 'TCS Digital',
    packageLpa: 7,
    packageLabel: '7+ LPA',
    tier: 'dream',
    rulesSummary: 'CGPA ≥ 7.0 · no active backlogs · coding test + TR + HR',
    rules: {
      minCgpa: 7.0,
      maxActiveBacklogs: 0,
      minCodingScore: 6,
    },
    driveDateLabel: '14 Aug',
    registrationStatus: 'open',
  },
  {
    companyId: 'infosys-sp',
    name: 'Infosys SP',
    packageLpa: 6.5,
    packageLabel: '6.5 LPA',
    tier: 'core_it',
    rulesSummary: 'CGPA ≥ 6.5 · InfyTQ certification preferred · aptitude + coding',
    rules: {
      minCgpa: 6.5,
      maxActiveBacklogs: 0,
      preferredCerts: ['InfyTQ'],
    },
    driveDateLabel: '20 Aug',
    registrationStatus: 'registered',
    registeredCount: 89,
  },
  {
    companyId: 'wipro-turbo',
    name: 'Wipro Turbo',
    packageLpa: 9,
    packageLabel: '9 LPA',
    tier: 'dream',
    rulesSummary: 'CGPA ≥ 8.0 · no backlogs ever · online test + 3 rounds',
    rules: {
      minCgpa: 8.0,
      maxActiveBacklogs: 0,
      maxEverBacklogs: 0,
      minCodingScore: 7,
    },
    driveDateLabel: '8 Aug',
    registrationStatus: 'open',
  },
  {
    companyId: 'cognizant-genc',
    name: 'Cognizant GenC',
    packageLpa: 4.5,
    packageLabel: '4.5 LPA',
    tier: 'mass',
    rulesSummary: 'CGPA ≥ 6.0 · GenC Next 5.5 LPA if CGPA ≥ 7.5',
    rules: {
      minCgpa: 6.0,
      maxActiveBacklogs: 0,
    },
    driveDateLabel: '28 Aug',
    registrationStatus: 'upcoming',
  },
];

export function rulesForCompany(companyId: string): EligibilityRules | undefined {
  return PILOT_COMPANY_DEFINITIONS.find((company) => company.companyId === companyId)?.rules;
}
