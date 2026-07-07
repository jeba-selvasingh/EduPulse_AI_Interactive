import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { ConsentController } from './consent.controller';
import { ConsentGuard } from './consent.guard';
import { ConsentService } from './consent.service';
import { ConsentStoreService } from './consent-store.service';

@Module({
  imports: [AuthModule, ObservabilityModule],
  controllers: [ConsentController],
  providers: [ConsentStoreService, ConsentService, ConsentGuard, RbacGuard],
  exports: [ConsentService, ConsentGuard],
})
export class ConsentModule {}
