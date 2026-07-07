import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { BlueprintController } from './blueprint.controller';
import { BlueprintService } from './blueprint.service';
import { BlueprintStoreService } from './blueprint-store.service';

@Module({
  imports: [AuthModule, ObservabilityModule],
  controllers: [BlueprintController],
  providers: [BlueprintStoreService, BlueprintService, RbacGuard],
  exports: [BlueprintService],
})
export class BlueprintModule {}
