import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import {
  consentPolicySchema,
  consentStatusSchema,
  updateConsentPolicySchema,
} from './consent.schema';
import { ConsentService } from './consent.service';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  /** Public — shown on consent screen immediately after sign-in */
  @Get('policy')
  getPolicy() {
    return { data: consentPolicySchema.parse(this.consent.getPolicy()) };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: AuthUser) {
    return { data: consentStatusSchema.parse(this.consent.getStatus(user)) };
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: AuthUser) {
    const result = this.consent.accept(user);
    return { data: result };
  }

  @Post('decline')
  @UseGuards(JwtAuthGuard)
  decline(@CurrentUser() user: AuthUser) {
    return { data: this.consent.decline(user) };
  }

  @Put('policy')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.ConsentManage)
  updatePolicy(@Body() body: unknown) {
    const parsed = updateConsentPolicySchema.parse(body);
    const policy = this.consent.updatePolicy(parsed.version, {
      summary: parsed.summary,
      retentionPolicy: parsed.retentionPolicy,
    });
    return { data: consentPolicySchema.parse(policy) };
  }
}
