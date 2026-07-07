import { Injectable } from '@nestjs/common';
import {
  type ModerationStatus,
  type PaperModerationRecord,
  isModerationLocked,
} from './paper-moderation.schema';

@Injectable()
export class PaperModerationStoreService {
  private readonly records = new Map<string, PaperModerationRecord>();

  get(paperId: string): PaperModerationRecord | undefined {
    return this.records.get(paperId);
  }

  save(record: PaperModerationRecord): PaperModerationRecord {
    this.records.set(record.paperId, record);
    return record;
  }

  isPackageLocked(paperId: string): boolean {
    const record = this.records.get(paperId);
    if (!record) return false;
    return isModerationLocked(record.status);
  }

  isAnswerSheetUnlocked(paperId: string): boolean {
    return this.records.get(paperId)?.status === 'approved';
  }

  getStatus(paperId: string): ModerationStatus {
    return this.records.get(paperId)?.status ?? 'draft';
  }
}
