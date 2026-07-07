import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { SyllabusController } from './syllabus.controller';
import { SyllabusService } from './syllabus.service';
import { SyllabusStorageService } from './syllabus-storage.service';
import { SyllabusStoreService } from './syllabus-store.service';

@Module({
  imports: [AuthModule, ConsentModule, ObservabilityModule],
  controllers: [SyllabusController],
  providers: [SyllabusStoreService, SyllabusStorageService, SyllabusService, RbacGuard],
  exports: [SyllabusService],
})
export class SyllabusModule {}
