import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import {
  type BlueprintRecord,
  type BlueprintView,
  type BloomTargets,
  type DifficultyProfile,
  type PatternProfile,
  PILOT_EXAM_TYPE,
  sumBloom,
  sumDifficulty,
} from './blueprint.schema';
import { BlueprintStoreService } from './blueprint-store.service';
import { BCS304_PATTERN_PROFILE } from './pilot-bcs304-blueprint.seed';

@Injectable()
export class BlueprintService {
  constructor(
    private readonly store: BlueprintStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getPatternProfile(courseCode: string): PatternProfile {
    const code = courseCode.toUpperCase();
    if (code === 'BCS304') {
      return BCS304_PATTERN_PROFILE;
    }

    return {
      code: `VTU_${code}_V1`,
      label: 'VTU v1',
      learnedFromPapers: 6,
      summary: 'Pilot pattern profile — expand with institution past papers',
    };
  }

  getBlueprintView(
    user: AuthUser,
    courseCode: string,
    examType: string = PILOT_EXAM_TYPE,
  ): BlueprintView {
    const blueprint = this.store.seedDefaultIfMissing(
      user.institutionId,
      courseCode,
      examType,
      user.sub,
    );

    return this.toView(blueprint);
  }

  saveBlueprint(
    user: AuthUser,
    courseCode: string,
    input: {
      examType?: string;
      difficulty: DifficultyProfile;
      bloom: BloomTargets;
    },
  ): BlueprintView {
    const started = Date.now();
    const examType = input.examType ?? PILOT_EXAM_TYPE;

    const blueprint = this.store.upsert({
      institutionId: user.institutionId,
      courseCode,
      examType,
      difficulty: input.difficulty,
      bloom: input.bloom,
      updatedBy: user.sub,
    });

    const view = this.toView(blueprint);

    this.actionLogger.logAction({
      action: LogAction.BlueprintSave,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode: blueprint.courseCode,
        examType: blueprint.examType,
        difficultyTotal: view.validation.difficultyTotal,
        bloomTotal: view.validation.bloomTotal,
        isValid: view.validation.isValid,
      },
    });

    return view;
  }

  assertReadyForGeneration(
    user: AuthUser,
    courseCode: string,
    examType: string = PILOT_EXAM_TYPE,
  ): BlueprintRecord {
    const view = this.getBlueprintView(user, courseCode, examType);

    if (!view.validation.isValid) {
      throw new BadRequestException({
        code: 'BLUEPRINT_INVALID',
        message:
          'Blueprint difficulty and Bloom targets must each total 100% before generation.',
        difficultyTotal: view.validation.difficultyTotal,
        bloomTotal: view.validation.bloomTotal,
      });
    }

    return view.blueprint;
  }

  private toView(blueprint: BlueprintRecord): BlueprintView {
    const difficultyTotal = sumDifficulty(blueprint.difficulty);
    const bloomTotal = sumBloom(blueprint.bloom);

    return {
      blueprint,
      patternProfile: this.getPatternProfile(blueprint.courseCode),
      validation: {
        difficultyTotal,
        bloomTotal,
        isValid: difficultyTotal === 100 && bloomTotal === 100,
      },
    };
  }
}
