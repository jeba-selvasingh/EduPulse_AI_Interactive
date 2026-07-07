import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import { MarksService } from './marks.service';
import { MarksExportService } from './marks-export.service';
import { MarksImportService } from './marks-import.service';
import { MasteryHeatmapService } from './mastery-heatmap.service';

@Controller('marks')
@UseGuards(JwtAuthGuard, RbacGuard, ConsentGuard)
export class MarksController {
  constructor(
    private readonly marks: MarksService,
    private readonly marksImport: MarksImportService,
    private readonly marksExport: MarksExportService,
    private readonly masteryHeatmap: MasteryHeatmapService,
  ) {}

  @Get('assessments/:courseCode/:examType/grid')
  @RequirePermissions(Permission.MarksEntry)
  getGrid(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.marks.getGrid(user, courseCode, examType) };
  }

  @Put('assessments/:courseCode/:examType/grid')
  @RequirePermissions(Permission.MarksEntry)
  partialSave(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Body() body: unknown,
  ) {
    return { data: this.marks.partialSave(user, courseCode, examType, body) };
  }

  @Get('assessments/:courseCode/:examType/import/template')
  @RequirePermissions(Permission.MarksEntry)
  getImportTemplate(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.marksImport.getTemplate(user, courseCode, examType) };
  }

  @Get('assessments/:courseCode/:examType/import/sample')
  @RequirePermissions(Permission.MarksEntry)
  getImportSample(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.marksImport.getSample(user, courseCode, examType) };
  }

  @Post('assessments/:courseCode/:examType/import')
  @RequirePermissions(Permission.MarksEntry)
  importMarks(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Body() body: unknown,
  ) {
    return { data: this.marksImport.import(user, courseCode, examType, body) };
  }

  @Get('assessments/:courseCode/:examType/heatmap')
  @RequirePermissions(Permission.MarksEntry)
  getHeatmap(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.masteryHeatmap.getHeatmap(user, courseCode, examType) };
  }

  @Get('assessments/:courseCode/:examType/heatmap/clusters/:coTag')
  @RequirePermissions(Permission.MarksEntry)
  getClusterDrillDown(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Param('coTag') coTag: string,
    @Query('scope') scope?: string,
  ) {
    return { data: this.masteryHeatmap.getClusterDrillDown(user, courseCode, examType, coTag, scope) };
  }

  @Get('assessments/:courseCode/:examType/export/template')
  @RequirePermissions(Permission.MarksPublish)
  getExportTemplate(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.marksExport.getExportTemplate(user, courseCode, examType) };
  }

  @Put('assessments/:courseCode/:examType/export/template')
  @RequirePermissions(Permission.MarksPublish)
  updateExportTemplate(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Body() body: unknown,
  ) {
    return { data: this.marksExport.updateExportTemplate(user, courseCode, examType, body) };
  }

  @Get('assessments/:courseCode/:examType/export/csv')
  @RequirePermissions(Permission.MarksPublish)
  async exportPublishedCsv(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: await this.marksExport.exportPublishedCsv(user, courseCode, examType) };
  }
}
