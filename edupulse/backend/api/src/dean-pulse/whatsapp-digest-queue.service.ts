import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type WhatsAppDigestJob = {
  queueId: string;
  institutionId: string;
  recipientUserId: string;
  templateId: string;
  headline: string;
  queuedAt: string;
};

@Injectable()
export class WhatsAppDigestQueueService {
  private readonly jobs: WhatsAppDigestJob[] = [];

  queueDigest(input: {
    institutionId: string;
    recipientUserId: string;
    headline: string;
  }): WhatsAppDigestJob {
    const job: WhatsAppDigestJob = {
      queueId: randomUUID(),
      institutionId: input.institutionId,
      recipientUserId: input.recipientUserId,
      templateId: 'monday_digest_v1',
      headline: input.headline,
      queuedAt: new Date().toISOString(),
    };
    this.jobs.push(job);
    return job;
  }

  listForUser(userId: string): WhatsAppDigestJob[] {
    return this.jobs.filter((j) => j.recipientUserId === userId);
  }

  findByQueueId(queueId: string): WhatsAppDigestJob | undefined {
    return this.jobs.find((j) => j.queueId === queueId);
  }
}
