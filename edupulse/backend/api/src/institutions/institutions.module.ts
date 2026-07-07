import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstitutionScopeGuard } from '../tenancy/institution-scope.guard';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';

@Module({
  imports: [AuthModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService, InstitutionScopeGuard],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
