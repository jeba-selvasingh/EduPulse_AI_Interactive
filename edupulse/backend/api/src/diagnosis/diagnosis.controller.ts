import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import { AcademicLevelService } from './academic-level.service';
import { ConceptDiagnosisService } from './concept-diagnosis.service';
import { ExamEvidenceService } from './exam-evidence.service';
import { ImprovementPlanService } from './improvement-plan.service';
import { editImprovementItemSchema } from './improvement-plan.schema';
import { ProgressTrackingService } from './progress-tracking.service';

@Controller('diagnosis')
@UseGuards(JwtAuthGuard, RbacGuard, ConsentGuard)
export class DiagnosisController {
  constructor(
    private readonly academicLevel: AcademicLevelService,
    private readonly conceptDiagnosis: ConceptDiagnosisService,
    private readonly examEvidence: ExamEvidenceService,
    private readonly improvementPlan: ImprovementPlanService,
    private readonly progressTracking: ProgressTrackingService,
  ) {}

  @Get('academic-level')
  @RequirePermissions(Permission.StudentDiagnosisRead)
  getAcademicLevel(@CurrentUser() user: AuthUser, @Query('usn') usn?: string) {
    return { data: this.academicLevel.getView(user, usn) };
  }

  @Get('concept-map/:courseCode')
  @RequirePermissions(Permission.StudentDiagnosisRead)
  getConceptMap(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Query('usn') usn?: string,
    @Query('examType') examType?: string,
    @Query('coTag') coTag?: string,
  ) {
    return {
      data: this.conceptDiagnosis.getMap(user, courseCode, { usn, examType, coTag }),
    };
  }

  @Get('exam-evidence/:courseCode/:examType')
  @RequirePermissions(Permission.StudentDiagnosisRead)
  getExamEvidence(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Query('usn') usn?: string,
  ) {
    return {
      data: this.examEvidence.getView(user, courseCode, examType, usn),
    };
  }

  @Get('improvement-plan')
  @RequirePermissions(Permission.StudentDiagnosisRead)
  getImprovementPlan(
    @CurrentUser() user: AuthUser,
    @Query('usn') usn?: string,
    @Query('courseCode') courseCode?: string,
    @Query('questionId') questionId?: string,
    @Query('examType') examType?: string,
  ) {
    return {
      data: this.improvementPlan.getPlan(user, { usn, courseCode, questionId, examType }),
    };
  }

  @Patch('improvement-plan/items/:itemId')
  @RequirePermissions(Permission.StudentDiagnosisRead)
  updateImprovementItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    const input = editImprovementItemSchema.parse(body);
    return {
      data: this.improvementPlan.updateItem(user, itemId, input),
    };
  }

  @Get('progress-tracking')
  @RequirePermissions(Permission.StudentDiagnosisRead)
  getProgressTracking(@CurrentUser() user: AuthUser, @Query('usn') usn?: string) {
    return { data: this.progressTracking.getView(user, usn) };
  }
}
