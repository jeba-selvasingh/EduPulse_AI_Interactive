import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type WhatsAppReminderJob = {
  queueId: string;
  driveId: string;
  companyName: string;
  recipientCount: number;
  templateId: string;
  queuedAt: string;
  institutionId: string;
  requestedByUserId: string;
};

@Injectable()
export class WhatsAppReminderQueueService {
  private readonly jobs: WhatsAppReminderJob[] = [];

  queueReminder(input: {
    driveId: string;
    companyName: string;
    recipientCount: number;
    institutionId: string;
    requestedByUserId: string;
  }): WhatsAppReminderJob {
    const job: WhatsAppReminderJob = {
      queueId: randomUUID(),
      driveId: input.driveId,
      companyName: input.companyName,
      recipientCount: input.recipientCount,
      templateId: 'drive_registration_reminder_v1',
      queuedAt: new Date().toISOString(),
      institutionId: input.institutionId,
      requestedByUserId: input.requestedByUserId,
    };

    this.jobs.push(job);
    return job;
  }

  listForInstitution(institutionId: string): WhatsAppReminderJob[] {
    return this.jobs.filter((job) => job.institutionId === institutionId);
  }

  findByQueueId(queueId: string): WhatsAppReminderJob | undefined {
    return this.jobs.find((job) => job.queueId === queueId);
  }
}
