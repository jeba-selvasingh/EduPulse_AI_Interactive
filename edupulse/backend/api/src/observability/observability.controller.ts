import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import { StructuredLoggerService } from './structured-logger.service';

/** Dev-only log tail for operators / verify scripts — disabled outside AUTH_DEV_MODE */
@Controller('observability')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ObservabilityController {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: StructuredLoggerService,
  ) {}

  @Get('logs/recent')
  @RequirePermissions(Permission.ObservabilityRead)
  getRecentLogs() {
    if (this.config.get<string>('AUTH_DEV_MODE', 'true') !== 'true') {
      return { data: [] };
    }

    return { data: this.logger.getRecentLogs(50) };
  }
}
