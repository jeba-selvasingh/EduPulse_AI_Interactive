import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { BlueprintRecord, BloomTargets, DifficultyProfile } from './blueprint.schema';
import {
  BCS304_DEFAULT_BLOOM,
  BCS304_DEFAULT_DIFFICULTY,
} from './pilot-bcs304-blueprint.seed';

type BlueprintKey = string;

@Injectable()
export class BlueprintStoreService {
  private readonly byKey = new Map<BlueprintKey, BlueprintRecord>();

  private key(institutionId: string, courseCode: string, examType: string): BlueprintKey {
    return `${institutionId}:${courseCode.toUpperCase()}:${examType}`;
  }

  get(
    institutionId: string,
    courseCode: string,
    examType: string,
  ): BlueprintRecord | undefined {
    return this.byKey.get(this.key(institutionId, courseCode, examType));
  }

  upsert(input: {
    institutionId: string;
    courseCode: string;
    examType: string;
    difficulty: DifficultyProfile;
    bloom: BloomTargets;
    updatedBy: string;
  }): BlueprintRecord {
    const k = this.key(input.institutionId, input.courseCode, input.examType);
    const existing = this.byKey.get(k);
    const now = new Date().toISOString();

    const record: BlueprintRecord = {
      id: existing?.id ?? randomUUID(),
      institutionId: input.institutionId,
      courseCode: input.courseCode.toUpperCase(),
      examType: input.examType as BlueprintRecord['examType'],
      difficulty: input.difficulty,
      bloom: input.bloom,
      updatedBy: input.updatedBy,
      updatedAt: now,
    };

    this.byKey.set(k, record);
    return record;
  }

  seedDefaultIfMissing(
    institutionId: string,
    courseCode: string,
    examType: string,
    updatedBy: string,
  ): BlueprintRecord {
    const existing = this.get(institutionId, courseCode, examType);
    if (existing) {
      return existing;
    }

    return this.upsert({
      institutionId,
      courseCode,
      examType,
      difficulty: { ...BCS304_DEFAULT_DIFFICULTY },
      bloom: { ...BCS304_DEFAULT_BLOOM },
      updatedBy,
    });
  }
}
