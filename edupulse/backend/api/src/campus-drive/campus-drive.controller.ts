import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import {
  EligibilityTrackerService,
  parseTierFilter,
} from './eligibility-tracker.service';
import { ReadinessTierService } from './readiness-tier.service';
import { StudentReadinessDetailService } from './student-readiness-detail.service';
import { TrainingModuleDashboardService } from './training-module-dashboard.service';
import { DriveCalendarService } from './drive-calendar.service';
import { BatchReadinessReportService } from './batch-readiness-report.service';
import { InterventionPriorityService } from './intervention-priority.service';
import { MockTestService } from './mock-test.service';

@Controller('campus-drive')
@UseGuards(JwtAuthGuard, RbacGuard, ConsentGuard)
export class CampusDriveController {
  constructor(
    private readonly eligibility: EligibilityTrackerService,
    private readonly readinessTier: ReadinessTierService,
    private readonly studentReadiness: StudentReadinessDetailService,
    private readonly trainingDashboards: TrainingModuleDashboardService,
    private readonly driveCalendar: DriveCalendarService,
    private readonly batchReadinessReport: BatchReadinessReportService,
    private readonly interventionPriority: InterventionPriorityService,
    private readonly mockTests: MockTestService,
  ) {}

  @Get('home')
  @RequirePermissions(Permission.CampusDriveRead)
  getHome(@CurrentUser() user: AuthUser) {
    return { data: this.eligibility.getHomeView(user) };
  }

  @Get('eligibility')
  @RequirePermissions(Permission.CampusDriveRead)
  getEligibility(@CurrentUser() user: AuthUser, @Query('tier') tier?: string) {
    return {
      data: this.eligibility.getTrackerView(user, parseTierFilter(tier)),
    };
  }

  @Get('readiness-board')
  @RequirePermissions(Permission.CampusDriveRead)
  getReadinessBoard(@CurrentUser() user: AuthUser) {
    return { data: this.readinessTier.getBoardView(user) };
  }

  @Patch('readiness-weights')
  @RequirePermissions(Permission.CampusDriveRead)
  updateReadinessWeights(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return { data: this.readinessTier.updateWeights(user, body) };
  }

  @Get('student-readiness')
  @RequirePermissions(Permission.CampusDriveRead)
  getStudentReadiness(@CurrentUser() user: AuthUser, @Query('usn') usn?: string) {
    return { data: this.studentReadiness.getDetail(user, usn ?? '') };
  }

  @Get('training-dashboards')
  @RequirePermissions(Permission.CampusDriveRead)
  getTrainingDashboards(@CurrentUser() user: AuthUser, @Query('track') track?: string) {
    return { data: this.trainingDashboards.getDashboardView(user, track) };
  }

  @Get('drive-calendar')
  @RequirePermissions(Permission.CampusDriveRead)
  getDriveCalendar(@CurrentUser() user: AuthUser, @Query('driveId') driveId?: string) {
    if (driveId) {
      return { data: this.driveCalendar.getDriveDetail(user, driveId) };
    }
    return { data: this.driveCalendar.getCalendarView(user) };
  }

  @Post('drive-calendar/reminders')
  @RequirePermissions(Permission.CampusDriveRead)
  queueDriveReminder(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return { data: this.driveCalendar.queueReminder(user, body) };
  }

  @Get('batch-readiness-report')
  @RequirePermissions(Permission.CampusDriveRead)
  getBatchReadinessReport(@CurrentUser() user: AuthUser) {
    return { data: this.batchReadinessReport.getReportView(user) };
  }

  @Post('batch-readiness-report/export')
  @RequirePermissions(Permission.CampusDriveRead)
  async exportBatchReadinessReport(
    @CurrentUser() user: AuthUser,
    @Query('format') format?: string,
  ) {
    return { data: await this.batchReadinessReport.exportReport(user, format) };
  }

  @Get('intervention-priority')
  @RequirePermissions(Permission.CampusDriveRead)
  getInterventionPriority(@CurrentUser() user: AuthUser, @Query('focus') focus?: string) {
    return { data: this.interventionPriority.getPriorityView(user, focus) };
  }

  @Patch('intervention-priority/:interventionId/completion')
  @RequirePermissions(Permission.CampusDriveRead)
  updateInterventionCompletion(
    @CurrentUser() user: AuthUser,
    @Param('interventionId') interventionId: string,
    @Body() body: unknown,
  ) {
    return { data: this.interventionPriority.updateCompletion(user, interventionId, body) };
  }

  @Get('mock-tests')
  @RequirePermissions(Permission.CampusDriveRead)
  getMockTests(@CurrentUser() user: AuthUser, @Query('mockId') mockId?: string) {
    if (mockId) {
      return { data: this.mockTests.getMockDetail(user, mockId) };
    }
    return { data: this.mockTests.getScheduleView(user) };
  }

  @Post('mock-tests')
  @RequirePermissions(Permission.CampusDriveRead)
  scheduleMockTest(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return { data: this.mockTests.scheduleMock(user, body) };
  }

  @Post('mock-tests/:mockId/register')
  @RequirePermissions(Permission.CampusDriveRead)
  registerForMockTest(@CurrentUser() user: AuthUser, @Param('mockId') mockId: string) {
    return { data: this.mockTests.registerForMock(user, mockId) };
  }

  @Post('mock-tests/:mockId/submissions')
  @RequirePermissions(Permission.CampusDriveRead)
  submitMockTestObjectives(
    @CurrentUser() user: AuthUser,
    @Param('mockId') mockId: string,
    @Body() body: unknown,
  ) {
    return { data: this.mockTests.submitAndGrade(user, mockId, body) };
  }
}
