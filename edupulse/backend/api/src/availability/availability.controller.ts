import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import {
  bannerSchema,
  createExamWindowSchema,
  deepHealthSchema,
  examWindowSchema,
  incidentSchema,
  maintenanceWindowSchema,
  scheduleMaintenanceSchema,
  sloSummarySchema,
  type ComponentId,
} from './availability.schema';
import { AvailabilityService } from './availability.service';

@Controller('availability')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('banner')
  getBanner(@CurrentUser() user: AuthUser) {
    return { data: bannerSchema.parse(this.availability.getBanner(user)) };
  }

  @Get('exam-windows')
  @RequirePermissions(Permission.AvailabilityRead)
  listExamWindows(@CurrentUser() user: AuthUser) {
    const windows = this.availability.listExamWindows(user);
    return { data: windows.map((w) => examWindowSchema.parse(w)) };
  }

  @Post('exam-windows')
  @RequirePermissions(Permission.AvailabilityManage)
  createExamWindow(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = createExamWindowSchema.parse(body);
    const window = this.availability.createExamWindow(user, parsed);
    return { data: examWindowSchema.parse(window) };
  }

  @Get('health/deep')
  @RequirePermissions(Permission.AvailabilityRead)
  async deepHealth(
    @CurrentUser() user: AuthUser,
    @Query('simulateFailure') simulateFailure?: ComponentId,
  ) {
    const result = await this.availability.runDeepHealth(user, simulateFailure);
    return { data: deepHealthSchema.parse(result) };
  }

  @Get('slo')
  @RequirePermissions(Permission.AvailabilityRead)
  getSlo(@CurrentUser() user: AuthUser) {
    const summary = this.availability.getSloSummary(user);
    return { data: summary ? sloSummarySchema.parse(summary) : null };
  }

  @Get('maintenance')
  @RequirePermissions(Permission.AvailabilityRead)
  listMaintenance(@CurrentUser() user: AuthUser) {
    const items = this.availability.listMaintenance(user);
    return { data: items.map((m) => maintenanceWindowSchema.parse(m)) };
  }

  @Post('maintenance')
  @RequirePermissions(Permission.AvailabilityManage)
  scheduleMaintenance(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = scheduleMaintenanceSchema.parse(body);
    const record = this.availability.scheduleMaintenance(user, parsed);
    return { data: maintenanceWindowSchema.parse(record) };
  }

  @Get('incidents')
  @RequirePermissions(Permission.AvailabilityRead)
  listIncidents(@CurrentUser() user: AuthUser) {
    const items = this.availability.listIncidents(user);
    return { data: items.map((i) => incidentSchema.parse(i)) };
  }
}
