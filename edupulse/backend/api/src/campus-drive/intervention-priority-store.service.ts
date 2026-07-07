import { Injectable } from '@nestjs/common';
import type { InterventionCompletionStatus } from './intervention-priority.schema';

type CompletionRecord = {
  status: InterventionCompletionStatus;
  completionPercent?: number;
  completionNote?: string;
  updatedAt: string;
};

@Injectable()
export class InterventionPriorityStoreService {
  private readonly completionByInstitution = new Map<string, Map<string, CompletionRecord>>();

  getCompletion(institutionId: string, interventionId: string): CompletionRecord | undefined {
    return this.completionByInstitution.get(institutionId)?.get(interventionId);
  }

  setCompletion(
    institutionId: string,
    interventionId: string,
    record: Omit<CompletionRecord, 'updatedAt'>,
  ): CompletionRecord {
    if (!this.completionByInstitution.has(institutionId)) {
      this.completionByInstitution.set(institutionId, new Map());
    }

    const saved: CompletionRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    this.completionByInstitution.get(institutionId)!.set(interventionId, saved);
    return saved;
  }
}
