import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CohortModule } from '../cohort/cohort.module';
import { ConsentModule } from '../consent/consent.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { MarksModule } from '../marks/marks.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { DiagnosisController } from './diagnosis.controller';
import { AcademicLevelService } from './academic-level.service';
import { ConceptDiagnosisService } from './concept-diagnosis.service';
import { ExamEvidenceService } from './exam-evidence.service';
import { ImprovementPlanService } from './improvement-plan.service';
import { ImprovementPlanStoreService } from './improvement-plan-store.service';
import { ProgressTrackingService } from './progress-tracking.service';

@Module({
  imports: [
    AuthModule,
    ConsentModule,
    CohortModule,
    MarksModule,
    EvaluationModule,
    ExplainabilityModule,
    ObservabilityModule,
  ],
  controllers: [DiagnosisController],
  providers: [
    AcademicLevelService,
    ConceptDiagnosisService,
    ExamEvidenceService,
    ImprovementPlanService,
    ImprovementPlanStoreService,
    ProgressTrackingService,
    RbacGuard,
  ],
  exports: [
    AcademicLevelService,
    ConceptDiagnosisService,
    ExamEvidenceService,
    ImprovementPlanService,
    ProgressTrackingService,
  ],
})
export class DiagnosisModule {}
