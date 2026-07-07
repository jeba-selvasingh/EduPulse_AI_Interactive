import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import {
  appendAuditEventSchema,
  auditEventSchema,
} from './audit-event.schema';
import { ExplainabilityService } from './explainability.service';

@Controller('audit-events')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AuditEventsController {
  constructor(private readonly explainability: ExplainabilityService) {}

  @Get('artifact/:artifactId')
  @RequirePermissions(Permission.AuditRead)
  listForArtifact(@Param('artifactId') artifactId: string) {
    const events = this.explainability.getAuditTrail(artifactId);
    return { data: events.map((e) => auditEventSchema.parse(e)) };
  }

  @Post('override')
  @RequirePermissions(Permission.AuditAppendOverride)
  appendOverride(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = appendAuditEventSchema.parse({
      ...(body as object),
      eventType: 'override',
    });
    const event = this.explainability.appendAuditEvent(user, parsed);
    return { data: auditEventSchema.parse(event) };
  }

  @Post('approve')
  @RequirePermissions(Permission.AuditAppendApproval)
  appendApproval(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = appendAuditEventSchema.parse({
      ...(body as object),
      eventType: 'approval',
    });
    const event = this.explainability.appendAuditEvent(user, parsed);
    return { data: auditEventSchema.parse(event) };
  }

  @Post('edit')
  @RequirePermissions(Permission.AuditAppendEdit)
  appendEdit(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = appendAuditEventSchema.parse({
      ...(body as object),
      eventType: 'edit',
    });
    const event = this.explainability.appendAuditEvent(user, parsed);
    return { data: auditEventSchema.parse(event) };
  }

  @Patch(':id')
  rejectPatch() {
    return this.explainability.rejectMutation();
  }

  @Put(':id')
  rejectPut() {
    return this.explainability.rejectMutation();
  }

  @Delete(':id')
  rejectDelete() {
    return this.explainability.rejectMutation();
  }
}
