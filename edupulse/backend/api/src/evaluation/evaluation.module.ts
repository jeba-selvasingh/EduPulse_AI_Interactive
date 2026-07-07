import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CohortModule } from '../cohort/cohort.module';
import { ConsentModule } from '../consent/consent.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PaperCraftModule } from '../paper-craft/paper-craft.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { MarksModule } from '../marks/marks.module';
import { TrustCardsModule } from '../trust-cards/trust-cards.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { AiEvaluationService } from './ai-evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { EvaluationStoreService } from './evaluation-store.service';
import { EvaluationWorkflowService } from './evaluation-workflow.service';
import { FacultyReviewService } from './faculty-review.service';
import { BulkUploadService } from './bulk-upload.service';
import { EvaluationPublishService } from './evaluation-publish.service';
import { SheetCaptureService } from './sheet-capture.service';
import { BatchInsightsService } from './batch-insights.service';

@Module({
  imports: [AuthModule, ConsentModule, CohortModule, PaperCraftModule, TrustCardsModule, ExplainabilityModule, ObservabilityModule, MarksModule],
  controllers: [EvaluationController],
  providers: [
    EvaluationStoreService,
    EvaluationWorkflowService,
    SheetCaptureService,
    BulkUploadService,
    AiEvaluationService,
    FacultyReviewService,
    BatchInsightsService,
    EvaluationPublishService,
    RbacGuard,
  ],
  exports: [EvaluationWorkflowService, EvaluationStoreService],
})
export class EvaluationModule {}
