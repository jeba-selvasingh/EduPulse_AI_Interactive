import { Injectable, OnModuleInit } from '@nestjs/common';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { AuthUser } from '../auth/auth.types';
import {
  COHORT_CSV_TEMPLATE_HEADER,
  type CourseRoster,
  type ImportSummary,
} from './cohort.schema';
import { CohortStoreService } from './cohort-store.service';
import { generatePilotBcs304Csv } from './pilot-bcs304.seed';

const PES_INSTITUTION_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class CohortService implements OnModuleInit {
  constructor(
    private readonly store: CohortStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  onModuleInit() {
    this.store.ensurePilotSeed(PES_INSTITUTION_ID);
  }

  getTemplate(): string {
    return `${COHORT_CSV_TEMPLATE_HEADER}\nPES1UG23CS001,Aditi K,BCS304,CSE-A,Odd Sem 2026`;
  }

  getPilotSample(): string {
    return generatePilotBcs304Csv();
  }

  importCsv(user: AuthUser, csv: string): ImportSummary {
    const started = Date.now();
    const summary = this.store.importCsv(user.institutionId, csv);

    this.actionLogger.logAction({
      action: LogAction.CohortImport,
      durationMs: Date.now() - started,
      outcome: summary.errors.length > 0 && summary.enrollmentsCreated === 0 && summary.enrollmentsUpdated === 0
        ? 'failure'
        : 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        rowsProcessed: summary.rowsProcessed,
        studentsCreated: summary.studentsCreated,
        studentsUpdated: summary.studentsUpdated,
        enrollmentsCreated: summary.enrollmentsCreated,
        enrollmentsUpdated: summary.enrollmentsUpdated,
        errorCount: summary.errors.length,
      },
    });

    return summary;
  }

  getCourseRoster(user: AuthUser, courseCode: string): CourseRoster {
    this.store.ensurePilotSeed(user.institutionId);
    return this.store.getCourseRoster(user.institutionId, courseCode);
  }
}
