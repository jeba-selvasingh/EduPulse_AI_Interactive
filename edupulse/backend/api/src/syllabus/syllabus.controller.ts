import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import {
  activateVersionResultSchema,
  syllabusGenerationWarningSchema,
  syllabusModuleSchema,
  syllabusRecordSchema,
  syllabusUploadResultSchema,
  uploadSyllabusBodySchema,
  upsertModulesBodySchema,
} from './syllabus.schema';
import { SyllabusService } from './syllabus.service';

@Controller('syllabus')
@UseGuards(JwtAuthGuard, ConsentGuard, RbacGuard)
export class SyllabusController {
  constructor(private readonly syllabus: SyllabusService) {}

  @Get('sample/pdf')
  @RequirePermissions(Permission.SyllabusUpload)
  getSamplePdf() {
    return {
      data: {
        fileName: 'BCS304-sample-syllabus.pdf',
        base64: this.syllabus.getSamplePdfBase64(),
      },
    };
  }

  @Get('courses/:courseCode')
  @RequirePermissions(Permission.SyllabusRead)
  getCourseSyllabus(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Query('academicTerm') academicTerm?: string,
  ) {
    const record = this.syllabus.getCourseSyllabus(user, courseCode, academicTerm);
    return { data: syllabusRecordSchema.parse(record) };
  }

  @Get('courses/:courseCode/versions')
  @RequirePermissions(Permission.SyllabusRead)
  listVersions(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Query('academicTerm') academicTerm?: string,
  ) {
    const versions = this.syllabus.listVersions(user, courseCode, academicTerm);
    return { data: versions.map((v) => syllabusRecordSchema.parse(v)) };
  }

  @Post('courses/:courseCode/versions/:syllabusId/activate')
  @RequirePermissions(Permission.SyllabusActivate)
  activateVersion(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('syllabusId') syllabusId: string,
    @Query('academicTerm') academicTerm?: string,
  ) {
    const result = this.syllabus.activateVersion(user, courseCode, syllabusId, academicTerm);
    return {
      data: activateVersionResultSchema.parse({
        activated: result.activated,
        superseded: result.superseded,
      }),
    };
  }

  @Get('versions/:syllabusId/generation-warning')
  @RequirePermissions(Permission.SyllabusRead, Permission.PaperCraftGenerate)
  getGenerationWarning(
    @CurrentUser() user: AuthUser,
    @Param('syllabusId') syllabusId: string,
  ) {
    const warning = this.syllabus.getGenerationWarning(user, syllabusId);
    return {
      data: warning ? syllabusGenerationWarningSchema.parse(warning) : null,
    };
  }

  @Post('courses/:courseCode/upload')
  @RequirePermissions(Permission.SyllabusUpload)
  async uploadSyllabus(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Body() body: unknown,
  ) {
    const parsed = uploadSyllabusBodySchema.parse(body);
    const result = await this.syllabus.uploadPdf(user, courseCode, parsed);
    return { data: syllabusUploadResultSchema.parse(result) };
  }

  @Get('courses/:courseCode/modules')
  @RequirePermissions(Permission.SyllabusRead)
  listModules(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Query('academicTerm') academicTerm?: string,
    @Query('syllabusVersionId') syllabusVersionId?: string,
  ) {
    const modules = this.syllabus.listModules(
      user,
      courseCode,
      academicTerm,
      syllabusVersionId,
    );
    return { data: modules.map((m) => syllabusModuleSchema.parse(m)) };
  }

  @Put('courses/:courseCode/modules')
  @RequirePermissions(Permission.SyllabusUpload)
  saveModules(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Body() body: unknown,
    @Query('academicTerm') academicTerm?: string,
    @Query('syllabusVersionId') syllabusVersionId?: string,
  ) {
    const parsed = upsertModulesBodySchema.parse(body);
    const modules = this.syllabus.saveModules(
      user,
      courseCode,
      parsed.modules,
      academicTerm,
      syllabusVersionId,
    );
    return { data: modules.map((m) => syllabusModuleSchema.parse(m)) };
  }
}
