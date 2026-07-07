import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { CampusDriveController } from './campus-drive.controller';
import { EligibilityTrackerService } from './eligibility-tracker.service';
import { ReadinessTierService } from './readiness-tier.service';
import { ReadinessTierStoreService } from './readiness-tier-store.service';
import { StudentReadinessDetailService } from './student-readiness-detail.service';
import { TrainingModuleDashboardService } from './training-module-dashboard.service';
import { DriveCalendarService } from './drive-calendar.service';
import { WhatsAppReminderQueueService } from './whatsapp-reminder-queue.service';
import { BatchReadinessReportService } from './batch-readiness-report.service';
import { InterventionPriorityService } from './intervention-priority.service';
import { InterventionPriorityStoreService } from './intervention-priority-store.service';
import { MockTestService } from './mock-test.service';
import { MockTestStoreService } from './mock-test-store.service';

@Module({
  imports: [AuthModule, ConsentModule, InstitutionsModule, ObservabilityModule],
  controllers: [CampusDriveController],
  providers: [
    EligibilityTrackerService,
    ReadinessTierService,
    ReadinessTierStoreService,
    StudentReadinessDetailService,
    TrainingModuleDashboardService,
    DriveCalendarService,
    WhatsAppReminderQueueService,
    BatchReadinessReportService,
    InterventionPriorityService,
    InterventionPriorityStoreService,
    MockTestService,
    MockTestStoreService,
    RbacGuard,
  ],
  exports: [EligibilityTrackerService, ReadinessTierService],
})
export class CampusDriveModule {}
