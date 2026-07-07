import { z } from 'zod';

export const consentPolicySectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
});

export const consentPolicySchema = z.object({
  version: z.string(),
  title: z.string(),
  summary: z.string(),
  sections: z.array(consentPolicySectionSchema),
  retentionPolicy: z.string(),
  effectiveAt: z.string().datetime(),
});

export const consentStatusSchema = z.object({
  required: z.boolean(),
  currentVersion: z.string(),
  acceptedVersion: z.string().nullable(),
  acceptedAt: z.string().datetime().nullable(),
});

export const updateConsentPolicySchema = z.object({
  version: z.string().min(1).max(32),
  summary: z.string().min(1).max(500).optional(),
  retentionPolicy: z.string().min(1).max(500).optional(),
});

export type ConsentPolicy = z.infer<typeof consentPolicySchema>;
export type ConsentStatus = z.infer<typeof consentStatusSchema>;
