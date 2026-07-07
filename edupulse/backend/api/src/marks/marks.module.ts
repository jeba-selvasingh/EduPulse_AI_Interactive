import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CohortModule } from '../cohort/cohort.module';
import { ConsentModule } from '../consent/consent.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { MarksExportService } from './marks-export.service';
import { MarksImportService } from './marks-import.service';
import { MasteryHeatmapService } from './mastery-heatmap.service';
import { MarksController } from './marks.controller';
import { MarksService } from './marks.service';
import { MarksStoreService } from './marks-store.service';

@Module({
  imports: [AuthModule, ConsentModule, CohortModule, ObservabilityModule, ExplainabilityModule, InstitutionsModule],
  controllers: [MarksController],
  providers: [MarksStoreService, MarksService, MarksImportService, MarksExportService, MasteryHeatmapService, RbacGuard],
  exports: [MarksService, MasteryHeatmapService, MarksStoreService],
})
export class MarksModule {}
