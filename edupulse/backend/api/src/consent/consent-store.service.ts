import { Injectable } from '@nestjs/common';
import type { ConsentPolicy } from './consent.schema';

export type StoredConsent = {
  version: string;
  acceptedAt: string;
};

const DEFAULT_POLICY: ConsentPolicy = {
  version: '1.0.0',
  title: 'Data Processing Notice (DPDP)',
  summary:
    'EduPulse processes academic data on-premise at your institution to support teaching, assessment, and outcomes tracking.',
  sections: [
    {
      heading: 'On-premise storage',
      body:
        'Your data is stored on servers operated by your institution within India. EduPulse does not send student marks, answer sheet images, or personal identifiers to public cloud services.',
    },
    {
      heading: 'Purpose of processing',
      body:
        'We process academic information — including course enrolment, assessment marks, answer sheet images, and learning outcomes (CO/PO mastery) — solely to support faculty workflows, moderation, and institutional reporting.',
    },
    {
      heading: 'Data residency',
      body:
        'All processing occurs on-premise at PES University data centres in India, aligned with institutional data residency requirements.',
    },
  ],
  retentionPolicy:
    'Academic records are retained for the duration of your enrolment plus three academic years, after which they are archived or deleted per institutional policy.',
  effectiveAt: '2026-07-01T00:00:00.000Z',
};

@Injectable()
export class ConsentStoreService {
  private policy: ConsentPolicy = { ...DEFAULT_POLICY };
  private readonly acceptances = new Map<string, StoredConsent>();

  private key(institutionId: string, userId: string): string {
    return `${institutionId}:${userId}`;
  }

  getPolicy(): ConsentPolicy {
    return { ...this.policy, sections: [...this.policy.sections] };
  }

  getAcceptance(institutionId: string, userId: string): StoredConsent | undefined {
    return this.acceptances.get(this.key(institutionId, userId));
  }

  recordAcceptance(institutionId: string, userId: string, version: string): StoredConsent {
    const record: StoredConsent = {
      version,
      acceptedAt: new Date().toISOString(),
    };
    this.acceptances.set(this.key(institutionId, userId), record);
    return record;
  }

  clearAcceptance(institutionId: string, userId: string): void {
    this.acceptances.delete(this.key(institutionId, userId));
  }

  updatePolicyVersion(version: string, partial?: { summary?: string; retentionPolicy?: string }): ConsentPolicy {
    this.policy = {
      ...this.policy,
      version,
      effectiveAt: new Date().toISOString(),
      ...(partial?.summary ? { summary: partial.summary } : {}),
      ...(partial?.retentionPolicy ? { retentionPolicy: partial.retentionPolicy } : {}),
    };
    return this.getPolicy();
  }
}
