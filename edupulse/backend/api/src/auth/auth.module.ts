import { forwardRef, Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { KeycloakService } from './keycloak.service';

@Module({
  imports: [forwardRef(() => ObservabilityModule)],
  controllers: [AuthController],
  providers: [AuthService, KeycloakService, JwtAuthGuard],
  exports: [AuthService, KeycloakService, JwtAuthGuard],
})
export class AuthModule {}
