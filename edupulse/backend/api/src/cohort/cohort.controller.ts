import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import {
  courseRosterSchema,
  importCohortBodySchema,
  importSummarySchema,
} from './cohort.schema';
import { CohortService } from './cohort.service';

@Controller('cohort')
@UseGuards(JwtAuthGuard, ConsentGuard, RbacGuard)
export class CohortController {
  constructor(private readonly cohort: CohortService) {}

  @Get('import/template')
  @RequirePermissions(Permission.CohortImport)
  getTemplate() {
    return { data: { csv: this.cohort.getTemplate() } };
  }

  @Get('import/sample')
  @RequirePermissions(Permission.CohortImport)
  getSample() {
    return { data: { csv: this.cohort.getPilotSample() } };
  }

  @Post('import')
  @RequirePermissions(Permission.CohortImport)
  importCohort(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = importCohortBodySchema.parse(body);
    const summary = this.cohort.importCsv(user, parsed.csv);
    return { data: importSummarySchema.parse(summary) };
  }

  @Get('courses/:courseCode/roster')
  @RequirePermissions(Permission.MarksEntry, Permission.AnswerSheetAi)
  getRoster(@CurrentUser() user: AuthUser, @Param('courseCode') courseCode: string) {
    const roster = this.cohort.getCourseRoster(user, courseCode);
    return { data: courseRosterSchema.parse(roster) };
  }
}
