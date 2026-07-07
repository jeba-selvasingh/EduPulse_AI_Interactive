import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { Permission } from '../rbac/permissions';
import { RbacGuard } from '../rbac/rbac.guard';
import { AlertInboxService } from './alert-inbox.service';
import { InstitutionPulseService } from './institution-pulse.service';
import { MondayDigestService } from './monday-digest.service';
import { updateDigestPreferencesSchema } from './monday-digest.schema';

@Controller()
@UseGuards(JwtAuthGuard, RbacGuard, ConsentGuard)
export class DeanPulseController {
  constructor(
    private readonly institutionPulse: InstitutionPulseService,
    private readonly alertInbox: AlertInboxService,
    private readonly mondayDigest: MondayDigestService,
  ) {}

  @Get('dean-pulse')
  @RequirePermissions(Permission.DeanPulseRead)
  getInstitutionPulse(@CurrentUser() user: AuthUser) {
    return { data: this.institutionPulse.getDashboard(user) };
  }

  @Get('alerts')
  listAlerts(@CurrentUser() user: AuthUser) {
    return { data: this.alertInbox.listForUser(user) };
  }

  @Get('alerts/unread-count')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return { data: { unreadCount: this.alertInbox.getUnreadCount(user) } };
  }

  @Patch('alerts/:id/read')
  markAlertRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return { data: this.alertInbox.markRead(user, id) };
  }

  @Get('dean-pulse/monday-digest')
  @RequirePermissions(Permission.DeanPulseRead)
  getMondayDigest(@CurrentUser() user: AuthUser) {
    return { data: this.mondayDigest.getView(user) };
  }

  @Patch('dean-pulse/monday-digest/preferences')
  @RequirePermissions(Permission.DeanPulseRead)
  updateDigestPreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ) {
    const patch = updateDigestPreferencesSchema.parse(body);
    return { data: this.mondayDigest.updatePreferences(user, patch) };
  }

  @Post('dean-pulse/monday-digest/trigger')
  @RequirePermissions(Permission.DeanPulseRead)
  triggerMondayDigest(@CurrentUser() user: AuthUser) {
    return { data: this.mondayDigest.triggerWeeklyDelivery(user) };
  }
}
