import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { AuditEventsController } from './audit-events.controller';
import { AuditStoreService } from './audit-store.service';
import { ExplainabilityService } from './explainability.service';

@Module({
  imports: [AuthModule],
  controllers: [AuditEventsController],
  providers: [AuditStoreService, ExplainabilityService, RbacGuard],
  exports: [ExplainabilityService],
})
export class ExplainabilityModule {}
