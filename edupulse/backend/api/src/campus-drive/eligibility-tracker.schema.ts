import { z } from 'zod';

export const companyTierSchema = z.enum(['dream', 'core_it', 'mass']);
export const tierFilterSchema = z.enum(['all', 'dream', 'core_it', 'mass']);
export const registrationStatusSchema = z.enum([
  'open',
  'registered',
  'upcoming',
  'closed',
]);

export const eligibilityRulesSchema = z.object({
  minCgpa: z.number(),
  maxActiveBacklogs: z.number(),
  maxEverBacklogs: z.number().optional(),
  minCodingScore: z.number().optional(),
  preferredCerts: z.array(z.string()).optional(),
});

export const companyEligibilitySchema = z.object({
  companyId: z.string(),
  name: z.string(),
  packageLpa: z.number(),
  packageLabel: z.string(),
  tier: companyTierSchema,
  rulesSummary: z.string(),
  rules: eligibilityRulesSchema,
  driveDateLabel: z.string(),
  registrationStatus: registrationStatusSchema,
  registeredCount: z.number().optional(),
  eligibleCount: z.number(),
  notEligibleCount: z.number(),
  nearMissCount: z.number(),
});

export const nearMissInsightSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  nearMissCount: z.number(),
  cgpaGapLabel: z.string(),
  message: z.string(),
});

export const eligibilityTrackerViewSchema = z.object({
  batchLabel: z.string(),
  batchStrength: z.number(),
  totalCompanies: z.number(),
  activeTierFilter: tierFilterSchema,
  companies: z.array(companyEligibilitySchema),
  nearMissInsights: z.array(nearMissInsightSchema),
});

export const campusHomeViewSchema = z.object({
  batchLabel: z.string(),
  batchStrength: z.number(),
  dreamReadyCount: z.number(),
  driveDaysLeft: z.number(),
  offersReceived: z.number(),
  companyCount: z.number(),
  scheduledDrives: z.number(),
  newCompaniesThisMonth: z.number(),
  eligibilityRoute: z.string(),
});

export type CompanyTier = z.infer<typeof companyTierSchema>;
export type TierFilter = z.infer<typeof tierFilterSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type EligibilityRules = z.infer<typeof eligibilityRulesSchema>;
export type CompanyEligibility = z.infer<typeof companyEligibilitySchema>;
export type NearMissInsight = z.infer<typeof nearMissInsightSchema>;
export type EligibilityTrackerView = z.infer<typeof eligibilityTrackerViewSchema>;
export type CampusHomeView = z.infer<typeof campusHomeViewSchema>;
