import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import { AiEvaluationService } from './ai-evaluation.service';
import { BulkUploadService } from './bulk-upload.service';
import { BatchInsightsService } from './batch-insights.service';
import { FacultyReviewService } from './faculty-review.service';
import { EvaluationPublishService } from './evaluation-publish.service';
import { EvaluationWorkflowService } from './evaluation-workflow.service';
import { SheetCaptureService } from './sheet-capture.service';

@Controller('evaluation')
@UseGuards(JwtAuthGuard, RbacGuard, ConsentGuard)
export class EvaluationController {
  constructor(
    private readonly workflow: EvaluationWorkflowService,
    private readonly sheetCapture: SheetCaptureService,
    private readonly bulkUpload: BulkUploadService,
    private readonly aiEvaluation: AiEvaluationService,
    private readonly facultyReview: FacultyReviewService,
    private readonly batchInsights: BatchInsightsService,
    private readonly publish: EvaluationPublishService,
  ) {}

  @Get('assessments/:courseCode/:examType/dashboard')
  @RequirePermissions(Permission.AnswerSheetAi)
  getDashboard(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Query('paperId') paperId?: string,
  ) {
    return { data: this.workflow.getDashboard(user, courseCode, examType, paperId) };
  }

  @Post('assessments/:courseCode/:examType/capture/analyze')
  @RequirePermissions(Permission.AnswerSheetAi)
  analyzeCapture(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Body() body: unknown,
    @Query('paperId') paperId?: string,
  ) {
    return { data: this.sheetCapture.analyzeCapture(user, courseCode, examType, body, paperId) };
  }

  @Post('assessments/:courseCode/:examType/capture/confirm')
  @RequirePermissions(Permission.AnswerSheetAi)
  confirmCapture(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Body() body: unknown,
    @Query('paperId') paperId?: string,
  ) {
    return { data: this.sheetCapture.confirmCapture(user, courseCode, examType, body, paperId) };
  }

  @Get('assessments/:courseCode/:examType/bulk/sample')
  @RequirePermissions(Permission.AnswerSheetAi)
  getBulkSample(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.bulkUpload.getSample(user, courseCode, examType) };
  }

  @Post('assessments/:courseCode/:examType/bulk/upload')
  @RequirePermissions(Permission.AnswerSheetAi)
  uploadBulk(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Body() body: unknown,
    @Query('paperId') paperId?: string,
  ) {
    return { data: this.bulkUpload.upload(user, courseCode, examType, body, paperId) };
  }

  @Get('assessments/:courseCode/:examType/evaluate/:usn')
  @RequirePermissions(Permission.AnswerSheetAi)
  getSheetEvaluation(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Param('usn') usn: string,
  ) {
    return { data: this.aiEvaluation.getEvaluation(user, courseCode, examType, usn) };
  }

  @Post('assessments/:courseCode/:examType/evaluate/:usn')
  @RequirePermissions(Permission.AnswerSheetAi)
  runSheetEvaluation(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Param('usn') usn: string,
    @Query('paperId') paperId?: string,
  ) {
    return { data: this.aiEvaluation.evaluateSheet(user, courseCode, examType, usn, paperId) };
  }

  @Get('assessments/:courseCode/:examType/review/flagged')
  @RequirePermissions(Permission.AnswerSheetAi)
  listFlaggedReviews(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.facultyReview.listFlaggedItems(user, courseCode, examType) };
  }

  @Get('assessments/:courseCode/:examType/review/:usn/:questionId')
  @RequirePermissions(Permission.AnswerSheetAi)
  getFacultyReviewDetail(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Param('usn') usn: string,
    @Param('questionId') questionId: string,
  ) {
    return { data: this.facultyReview.getReviewDetail(user, courseCode, examType, usn, questionId) };
  }

  @Post('assessments/:courseCode/:examType/review/:usn/:questionId/accept')
  @RequirePermissions(Permission.AnswerSheetAi, Permission.AuditAppendApproval)
  acceptFacultyReview(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Param('usn') usn: string,
    @Param('questionId') questionId: string,
  ) {
    return { data: this.facultyReview.acceptReview(user, courseCode, examType, usn, questionId) };
  }

  @Post('assessments/:courseCode/:examType/review/:usn/:questionId/override')
  @RequirePermissions(Permission.AnswerSheetAi, Permission.AuditAppendOverride)
  overrideFacultyReview(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Param('usn') usn: string,
    @Param('questionId') questionId: string,
    @Body() body: unknown,
  ) {
    return { data: this.facultyReview.overrideReview(user, courseCode, examType, usn, questionId, body) };
  }

  @Post('assessments/:courseCode/:examType/review/:usn/:questionId/waive')
  @RequirePermissions(Permission.AnswerSheetAi, Permission.AuditAppendOverride)
  waiveFacultyReview(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
    @Param('usn') usn: string,
    @Param('questionId') questionId: string,
    @Body() body: unknown,
  ) {
    return { data: this.facultyReview.waiveReview(user, courseCode, examType, usn, questionId, body) };
  }

  @Get('assessments/:courseCode/:examType/publish/status')
  @RequirePermissions(Permission.AnswerSheetAi, Permission.MarksPublish)
  getPublishStatus(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.publish.getPublishStatus(user, courseCode, examType) };
  }

  @Post('assessments/:courseCode/:examType/publish')
  @RequirePermissions(Permission.AnswerSheetAi, Permission.MarksPublish)
  publishMarks(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.publish.publish(user, courseCode, examType) };
  }

  @Get('assessments/:courseCode/:examType/batch/insights')
  @RequirePermissions(Permission.AnswerSheetAi)
  getBatchInsights(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.batchInsights.getInsights(user, courseCode, examType) };
  }

  @Post('assessments/:courseCode/:examType/batch/refresh-heatmap')
  @RequirePermissions(Permission.AnswerSheetAi)
  refreshBatchHeatmap(
    @CurrentUser() user: AuthUser,
    @Param('courseCode') courseCode: string,
    @Param('examType') examType: string,
  ) {
    return { data: this.batchInsights.refreshHeatmap(user, courseCode, examType) };
  }
}
