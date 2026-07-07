import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityStoreService } from './availability-store.service';
import { ComponentHealthService } from './component-health.service';

@Module({
  imports: [AuthModule, ObservabilityModule, PrismaModule],
  controllers: [AvailabilityController],
  providers: [
    AvailabilityStoreService,
    ComponentHealthService,
    AvailabilityService,
    RbacGuard,
  ],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
