import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import {
  blueprintViewSchema,
  PILOT_EXAM_TYPE,
  upsertBlueprintBodySchema,
} from './blueprint.schema';
import { BlueprintService } from './blueprint.service';

@Controller('paper-craft')
@UseGuards(JwtAuthGuard, RbacGuard)
export class BlueprintController {
  constructor(private readonly blueprint: BlueprintService) {}

  @Get('blueprint/:courseCode')
  @RequirePermissions(Permission.PaperCraftGenerate)
  getBlueprint(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Query('examType') examType?: string,
  ) {
    const view = this.blueprint.getBlueprintView(user, courseCode, examType ?? PILOT_EXAM_TYPE);
    return { data: blueprintViewSchema.parse(view) };
  }

  @Put('blueprint/:courseCode')
  @RequirePermissions(Permission.PaperCraftGenerate)
  saveBlueprint(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Body() body: unknown,
  ) {
    const parsed = upsertBlueprintBodySchema.parse(body);
    const view = this.blueprint.saveBlueprint(user, courseCode, parsed);
    return { data: blueprintViewSchema.parse(view) };
  }
}
