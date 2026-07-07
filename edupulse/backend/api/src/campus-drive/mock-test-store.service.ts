import { Injectable } from '@nestjs/common';
import type { MockTestEntry } from './mock-test.schema';
import { PILOT_MOCK_SCHEDULE } from './pilot-mock-tests.seed';

type GradingRecord = {
  submittedCount: number;
  gradedCount: number;
  batchAvgScore: number;
  gradingCompletedInMinutes: number;
  completedAt: string;
};

@Injectable()
export class MockTestStoreService {
  private readonly scheduleByInstitution = new Map<string, MockTestEntry[]>();
  private readonly registrations = new Map<string, number>();
  private readonly gradingResults = new Map<string, GradingRecord>();

  getSchedule(institutionId: string): MockTestEntry[] {
    if (!this.scheduleByInstitution.has(institutionId)) {
      this.scheduleByInstitution.set(
        institutionId,
        PILOT_MOCK_SCHEDULE.map((entry) => ({ ...entry })),
      );
    }
    return this.scheduleByInstitution.get(institutionId)!;
  }

  addScheduledMock(institutionId: string, entry: MockTestEntry): MockTestEntry {
    const schedule = this.getSchedule(institutionId);
    schedule.push(entry);
    return entry;
  }

  findMock(institutionId: string, mockId: string): MockTestEntry | undefined {
    return this.getSchedule(institutionId).find((entry) => entry.mockId === mockId);
  }

  getRegistrationCount(institutionId: string, mockId: string): number {
    const key = `${institutionId}:${mockId}`;
    const stored = this.registrations.get(key);
    if (stored != null) {
      return stored;
    }
    const seed = this.findMock(institutionId, mockId);
    return seed?.registeredCount ?? 0;
  }

  incrementRegistration(institutionId: string, mockId: string, delta = 1): number {
    const current = this.getRegistrationCount(institutionId, mockId);
    const next = current + delta;
    this.registrations.set(`${institutionId}:${mockId}`, next);
    const mock = this.findMock(institutionId, mockId);
    if (mock) {
      mock.registeredCount = next;
    }
    return next;
  }

  saveGradingResult(
    institutionId: string,
    mockId: string,
    record: GradingRecord,
  ): GradingRecord {
    this.gradingResults.set(`${institutionId}:${mockId}`, record);
    const mock = this.findMock(institutionId, mockId);
    if (mock) {
      mock.status = 'done';
      mock.statusLabel = `Done · avg ${record.batchAvgScore}`;
      mock.participantsCount = record.submittedCount;
      mock.batchAvgScore = record.batchAvgScore;
      mock.description = `${record.submittedCount} students took · auto-graded in ${record.gradingCompletedInMinutes} min`;
    }
    return record;
  }

  getGradingResult(institutionId: string, mockId: string): GradingRecord | undefined {
    return this.gradingResults.get(`${institutionId}:${mockId}`);
  }
}
