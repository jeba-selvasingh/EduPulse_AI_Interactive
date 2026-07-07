import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { CohortController } from './cohort.controller';
import { CohortService } from './cohort.service';
import { CohortStoreService } from './cohort-store.service';

@Module({
  imports: [AuthModule, ConsentModule, ObservabilityModule],
  controllers: [CohortController],
  providers: [CohortStoreService, CohortService, RbacGuard],
  exports: [CohortService],
})
export class CohortModule {}
