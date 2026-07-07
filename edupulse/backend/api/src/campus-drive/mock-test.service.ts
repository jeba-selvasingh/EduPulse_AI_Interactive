import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { MockTestStoreService } from './mock-test-store.service';
import type {
  MockTestDetail,
  MockTestGradingResult,
  MockTestScheduleView,
} from './mock-test.schema';
import {
  mockTestSubmissionSchema,
  scheduleMockTestSchema,
} from './mock-test.schema';
import { PILOT_BATCH_LABEL } from './pilot-placement-students.seed';
import {
  MOCK_RESULTS_SLA_HOURS,
  PILOT_MOCK_SCHEDULE,
  PILOT_NEXT_MOCK,
  PILOT_SCORE_TREND,
} from './pilot-mock-tests.seed';

const GRADING_SLA_MINUTES = MOCK_RESULTS_SLA_HOURS * 60;

@Injectable()
export class MockTestService {
  constructor(
    private readonly actionLogger: StructuredLoggerService,
    private readonly store: MockTestStoreService,
  ) {}

  getScheduleView(user: AuthUser): MockTestScheduleView {
    const started = Date.now();
    const schedule = this.store.getSchedule(user.institutionId).map((entry) => ({
      ...entry,
      registeredCount:
        entry.registeredCount ?? this.store.getRegistrationCount(user.institutionId, entry.mockId),
    }));

    const view: MockTestScheduleView = {
      batchLabel: PILOT_BATCH_LABEL,
      monthLabel: 'Aug 2026',
      nextMock: PILOT_NEXT_MOCK,
      schedule,
      scoreTrend: PILOT_SCORE_TREND,
    };

    this.actionLogger.logAction({
      action: LogAction.CampusMockTestScheduleView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        scheduleCount: schedule.length,
        trendPoints: view.scoreTrend.length,
      },
    });

    return view;
  }

  getMockDetail(user: AuthUser, mockId?: string): MockTestDetail {
    const started = Date.now();
    const normalizedId = mockId?.trim();

    if (!normalizedId) {
      throw new BadRequestException('mockId query parameter is required');
    }

    const entry = this.store.findMock(user.institutionId, normalizedId);
    if (!entry) {
      throw new NotFoundException('Mock test not found');
    }

    const grading = this.store.getGradingResult(user.institutionId, normalizedId);
    const detail: MockTestDetail = {
      ...entry,
      registeredCount:
        entry.registeredCount ??
        this.store.getRegistrationCount(user.institutionId, normalizedId),
      sections: this.sectionsForMock(normalizedId),
      benchmarkScore: 68,
      gradingStatus: grading ? 'completed' : entry.status === 'done' ? 'completed' : 'not_started',
      gradingCompletedInMinutes: grading?.gradingCompletedInMinutes,
      gradingWithinSla: grading
        ? grading.gradingCompletedInMinutes <= GRADING_SLA_MINUTES
        : entry.status === 'done',
    };

    this.actionLogger.logAction({
      action: LogAction.CampusMockTestDetailView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { mockId: normalizedId, status: entry.status },
    });

    return detail;
  }

  scheduleMock(user: AuthUser, body: unknown): MockTestDetail {
    const started = Date.now();
    const parsed = scheduleMockTestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('Invalid mock test schedule payload');
    }

    const schedule = this.store.getSchedule(user.institutionId);
    const mockNumber = schedule.length + 1;
    const mockId = `mock-${mockNumber}-${parsed.data.patternLabel.toLowerCase().replace(/\s+/g, '-')}`;

    const entry = this.store.addScheduledMock(user.institutionId, {
      mockId,
      mockNumber,
      title: `Mock ${mockNumber} · ${parsed.data.dateLabel} · ${parsed.data.patternLabel}`,
      dateLabel: parsed.data.dateLabel,
      patternLabel: parsed.data.patternLabel,
      status: 'scheduled',
      statusLabel: 'Scheduled',
      description: parsed.data.focus
        ? `${parsed.data.focus} · ${parsed.data.durationMinutes} min`
        : `${parsed.data.durationMinutes} min · auto-graded`,
      durationMinutes: parsed.data.durationMinutes,
      canRegister: true,
    });

    this.actionLogger.logAction({
      action: LogAction.CampusMockTestScheduled,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        mockId,
        patternLabel: parsed.data.patternLabel,
        dateLabel: parsed.data.dateLabel,
      },
    });

    return {
      ...entry,
      sections: parsed.data.sections ?? this.defaultSections(),
      benchmarkScore: 68,
      gradingStatus: 'not_started',
    };
  }

  registerForMock(user: AuthUser, mockId: string): { mockId: string; registeredCount: number; registrationDeadlineLabel?: string } {
    const mock = this.store.findMock(user.institutionId, mockId);
    if (!mock) {
      throw new NotFoundException('Mock test not found');
    }
    if (!mock.canRegister) {
      throw new BadRequestException('Registration is not open for this mock test');
    }

    const registeredCount = this.store.incrementRegistration(user.institutionId, mockId);
    return {
      mockId,
      registeredCount,
      registrationDeadlineLabel: mock.registrationDeadlineLabel,
    };
  }

  submitAndGrade(user: AuthUser, mockId: string, body: unknown): MockTestGradingResult {
    const started = Date.now();
    const parsed = mockTestSubmissionSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException('Invalid mock test submission payload');
    }

    const mock = this.store.findMock(user.institutionId, mockId);
    if (!mock) {
      throw new NotFoundException('Mock test not found');
    }

    const submittedCount =
      parsed.data.submittedCount ??
      mock.registeredCount ??
      (this.store.getRegistrationCount(user.institutionId, mockId) || 78);

    const gradingCompletedInMinutes = 94;
    const batchAvgScore = mock.batchAvgScore ?? 67;

    const record = this.store.saveGradingResult(user.institutionId, mockId, {
      submittedCount,
      gradedCount: submittedCount,
      batchAvgScore,
      gradingCompletedInMinutes,
      completedAt: new Date().toISOString(),
    });

    const result: MockTestGradingResult = {
      mockId,
      submittedCount: record.submittedCount,
      gradedCount: record.gradedCount,
      batchAvgScore: record.batchAvgScore,
      gradingCompletedInMinutes: record.gradingCompletedInMinutes,
      gradingWithinSla: record.gradingCompletedInMinutes <= GRADING_SLA_MINUTES,
      resultsSlaHours: MOCK_RESULTS_SLA_HOURS,
      auditLogAction: LogAction.CampusMockTestSubmissionsGraded,
    };

    this.actionLogger.logAction({
      action: LogAction.CampusMockTestSubmissionsGraded,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        mockId,
        submittedCount: result.submittedCount,
        gradingCompletedInMinutes: result.gradingCompletedInMinutes,
        gradingWithinSla: result.gradingWithinSla,
      },
    });

    return result;
  }

  private sectionsForMock(mockId: string): string[] {
    if (mockId === 'mock-next-tcs' || mockId.includes('tcs')) {
      return ['Quant 26', 'Logical 24', 'Verbal 24', 'Coding 26'];
    }
    if (mockId.includes('infosys')) {
      return ['Verbal', 'Email writing', 'Logical'];
    }
    if (mockId.includes('wipro')) {
      return ['Essay writing', 'English'];
    }
    if (mockId.includes('accenture')) {
      return ['Cognitive ability', 'Attention to detail'];
    }
    return this.defaultSections();
  }

  private defaultSections(): string[] {
    return ['Quant', 'Logical', 'Verbal'];
  }
}
