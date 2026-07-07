import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AnswerKeyService } from '../paper-craft/answer-key.service';
import { CoPoMappingService } from '../paper-craft/co-po-mapping.service';
import { PaperExportService } from '../paper-craft/paper-export.service';
import { PaperModerationService } from '../paper-craft/paper-moderation.service';
import { PaperCraftService } from '../paper-craft/paper-craft.service';
import { MAX_GENERATION_QUESTIONS } from '../paper-craft/paper-craft.schema';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { Permission } from '../rbac/permissions';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { RbacGuard } from '../rbac/rbac.guard';
import { SyllabusService } from '../syllabus/syllabus.service';
import { BlueprintService } from '../blueprint/blueprint.service';
import { formatModuleSourceLabel } from '../syllabus/syllabus-modules.util';

@Controller('paper-craft')
@UseGuards(JwtAuthGuard, RbacGuard)
export class PaperCraftController {
  constructor(
    private readonly actionLogger: StructuredLoggerService,
    private readonly syllabus: SyllabusService,
    private readonly blueprint: BlueprintService,
    private readonly paperCraft: PaperCraftService,
    private readonly answerKeys: AnswerKeyService,
    private readonly coPoMappings: CoPoMappingService,
    private readonly moderation: PaperModerationService,
    private readonly paperExport: PaperExportService,
  ) {}

  @Get('modules/:courseCode')
  @RequirePermissions(Permission.PaperCraftGenerate)
  listModules(@CurrentUser() user: AuthUser, @Param('courseCode') courseCode: string) {
    try {
      const syllabus = this.syllabus.getCourseSyllabus(user, courseCode);
      const modules = this.syllabus.listModulesForSyllabus(syllabus.id);
      return {
        data: modules.map((m) => ({
          id: m.id,
          moduleNumber: m.moduleNumber,
          title: m.title,
          pageStart: m.pageStart,
          pageEnd: m.pageEnd,
          label: formatModuleSourceLabel(m),
        })),
      };
    } catch {
      return { data: [] };
    }
  }

  @Get('papers/:paperId')
  @RequirePermissions(Permission.PaperCraftGenerate)
  getPaper(@CurrentUser() user: AuthUser, @Param('paperId') paperId: string) {
    const paper = this.paperCraft.getPaper(user, paperId);
    return { data: paper };
  }

  @Post('papers/:paperId/questions/:questionId/regenerate')
  @RequirePermissions(Permission.PaperCraftGenerate)
  regenerateQuestion(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Param('questionId') questionId: string,
  ) {
    const started = Date.now();
    const { paper, question, replacedFlagged } = this.paperCraft.regenerateQuestion(
      user,
      paperId,
      questionId,
    );

    this.actionLogger.logAction({
      action: LogAction.AiPaperCraftRegenerate,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        paperId: paper.id,
        questionId: question.id,
        questionKey: question.questionKey,
        moduleNumber: question.moduleNumber,
        replacedFlagged,
      },
    });

    return {
      data: {
        paperId: paper.id,
        question,
        questions: paper.questions,
        flaggedCount: paper.questions.filter((q) => q.similarityWarning).length,
      },
    };
  }

  @Post('generate')
  @RequirePermissions(Permission.PaperCraftGenerate)
  generate(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      courseCode?: string;
      syllabusVersionId?: string;
      acknowledgeSuperseded?: boolean;
      questionCount?: number;
    },
  ) {
    const started = Date.now();
    const courseCode = body?.courseCode ?? 'BCS304';
    const questionCount = body?.questionCount;

    if (
      questionCount !== undefined &&
      (questionCount < 1 || questionCount > MAX_GENERATION_QUESTIONS)
    ) {
      throw new BadRequestException({
        code: 'INVALID_QUESTION_COUNT',
        message: `questionCount must be between 1 and ${MAX_GENERATION_QUESTIONS}`,
      });
    }

    const examBlueprint = this.blueprint.assertReadyForGeneration(user, courseCode);

    const syllabus = this.syllabus.assertGenerationAllowed(user, courseCode, {
      syllabusVersionId: body?.syllabusVersionId,
      acknowledgeSuperseded: body?.acknowledgeSuperseded,
    });

    const modules = this.syllabus.listModulesForSyllabus(syllabus.id);
    const syllabusSources = this.syllabus
      .getModuleSourceLabelsForSyllabus(syllabus.id)
      .map((label) => ({ label, kind: 'syllabus' as const }));

    const paper = this.paperCraft.generatePaper({
      user,
      courseCode,
      examType: examBlueprint.examType,
      syllabus,
      modules,
      blueprint: examBlueprint,
      syllabusSources,
      questionCount,
    });

    this.actionLogger.logAction({
      action: LogAction.AiPaperCraftGenerate,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        model: 'qwen2.5-14b · local',
        promptVersion: 'qp_gen v14',
        artifactId: paper.trustCardId,
        paperId: paper.id,
        status: 'completed',
        questionCount: paper.questionCount,
        durationMs: paper.durationMs,
        syllabusVersion: syllabus.version,
        blueprintExamType: examBlueprint.examType,
        acknowledgedSuperseded: Boolean(body?.acknowledgeSuperseded),
      },
    });

    return {
      data: {
        status: 'completed',
        message: `Generated ${paper.questionCount} questions in ${paper.durationMs}ms`,
        paperId: paper.id,
        trustCardId: paper.trustCardId,
        artifactId: paper.trustCardId,
        questionCount: paper.questionCount,
        durationMs: paper.durationMs,
        totalMarks: paper.totalMarks,
        questions: paper.questions,
        syllabusVersionId: syllabus.id,
        syllabusVersion: syllabus.version,
        usedSupersededSyllabus: syllabus.status === 'superseded',
      },
    };
  }

  @Post('papers/:paperId/answer-key/generate')
  @RequirePermissions(Permission.PaperCraftGenerate)
  generateAnswerKey(@CurrentUser() user: AuthUser, @Param('paperId') paperId: string) {
    const started = Date.now();
    const answerKey = this.answerKeys.generateAnswerKey(user, paperId);

    this.actionLogger.logAction({
      action: LogAction.AnswerKeyGenerate,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        paperId: answerKey.paperId,
        questionCount: answerKey.questions.length,
        courseCode: answerKey.courseCode,
      },
    });

    return { data: answerKey };
  }

  @Get('papers/:paperId/answer-key')
  @RequirePermissions(Permission.PaperCraftGenerate)
  getAnswerKey(@CurrentUser() user: AuthUser, @Param('paperId') paperId: string) {
    return { data: this.answerKeys.getAnswerKey(user, paperId) };
  }

  @Get('papers/:paperId/answer-key/:questionId')
  @RequirePermissions(Permission.PaperCraftGenerate)
  getQuestionAnswerKey(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Param('questionId') questionId: string,
  ) {
    return { data: this.answerKeys.getQuestionAnswerKey(user, paperId, questionId) };
  }

  @Put('papers/:paperId/answer-key/:questionId')
  @RequirePermissions(Permission.PaperCraftGenerate, Permission.AuditAppendEdit)
  updateModelAnswer(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Param('questionId') questionId: string,
    @Body() body: { modelAnswer?: string },
  ) {
    const updated = this.answerKeys.updateModelAnswer(user, paperId, questionId, body);
    return { data: updated };
  }

  @Get('papers/:paperId/co-po-mapping')
  @RequirePermissions(Permission.PaperCraftGenerate)
  getCoPoMapping(@CurrentUser() user: AuthUser, @Param('paperId') paperId: string) {
    return { data: this.coPoMappings.getMapping(user, paperId) };
  }

  @Put('papers/:paperId/co-po-mapping/:questionId')
  @RequirePermissions(Permission.PaperCraftGenerate)
  updateCoPoMapping(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Param('questionId') questionId: string,
    @Body() body: { coTag?: string; poTag?: string; strengthWeight?: 1 | 2 | 3 },
  ) {
    const started = Date.now();
    const result = this.coPoMappings.updateQuestionMapping(user, paperId, questionId, body);

    this.actionLogger.logAction({
      action: LogAction.CoPoMappingUpdate,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        paperId,
        questionId,
        coTag: result.mapping.coTag,
        poTag: result.mapping.poTag,
        strengthWeight: result.mapping.strengthWeight,
        underRepresentedCount: result.coverage.filter((entry) => entry.isUnderRepresented).length,
      },
    });

    return { data: result };
  }

  @Get('papers/:paperId/moderation')
  @RequirePermissions(Permission.PaperCraftGenerate, Permission.PaperModerationReview)
  getModerationStatus(@CurrentUser() user: AuthUser, @Param('paperId') paperId: string) {
    return { data: this.moderation.getStatus(user, paperId) };
  }

  @Post('papers/:paperId/moderation/submit')
  @RequirePermissions(Permission.PaperModerationSubmit)
  submitForModeration(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Body() body: { note?: string },
  ) {
    const started = Date.now();
    const record = this.moderation.submitForModeration(user, paperId, body);

    this.actionLogger.logAction({
      action: LogAction.ModerationSubmit,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        paperId: record.paperId,
        courseCode: record.courseCode,
        examType: record.examType,
        status: record.status,
      },
    });

    return { data: record };
  }

  @Post('papers/:paperId/moderation/approve')
  @RequirePermissions(Permission.PaperModerationReview, Permission.AuditAppendApproval)
  approveModeration(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Body() body: { note?: string },
  ) {
    const started = Date.now();
    const record = this.moderation.approvePackage(user, paperId, body);

    this.actionLogger.logAction({
      action: LogAction.ModerationApprove,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        paperId: record.paperId,
        courseCode: record.courseCode,
        answerSheetUnlocked: record.answerSheetUnlocked,
      },
    });

    return { data: record };
  }

  @Post('papers/:paperId/moderation/return')
  @RequirePermissions(Permission.PaperModerationReview)
  returnModeration(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Body() body: { comments: string },
  ) {
    const started = Date.now();
    const record = this.moderation.returnForChanges(user, paperId, body);

    this.actionLogger.logAction({
      action: LogAction.ModerationReturn,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        paperId: record.paperId,
        courseCode: record.courseCode,
      },
    });

    return { data: record };
  }

  @Get('papers/:paperId/evaluation-access')
  @RequirePermissions(Permission.AnswerSheetAi)
  getEvaluationAccess(@CurrentUser() user: AuthUser, @Param('paperId') paperId: string) {
    return { data: this.moderation.getEvaluationAccess(user, paperId) };
  }

  @Post('papers/:paperId/export/pdf')
  @RequirePermissions(Permission.PaperCraftGenerate)
  async exportPaperPdf(
    @CurrentUser() user: AuthUser,
    @Param('paperId') paperId: string,
    @Query('includeAnswerKey') includeAnswerKey?: string,
  ) {
    const started = Date.now();
    const includeKey = includeAnswerKey !== 'false';
    const exported = await this.paperExport.exportApprovedPaperPdf(user, paperId, {
      includeAnswerKey: includeKey,
    });

    this.actionLogger.logAction({
      action: LogAction.PaperExportPdf,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        paperId: exported.paperId,
        courseCode: exported.courseCode,
        examType: exported.examType,
        fileName: exported.fileName,
        byteLength: exported.byteLength,
        includesAnswerKey: exported.includesAnswerKey,
        exportedAt: exported.exportedAt,
      },
    });

    return { data: exported };
  }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard, RbacGuard)
export class NotificationsController {
  constructor(private readonly moderation: PaperModerationService) {}

  @Get()
  @RequirePermissions(Permission.PaperCraftGenerate, Permission.PaperModerationReview)
  listNotifications(@CurrentUser() user: AuthUser) {
    return { data: this.moderation.listNotifications(user) };
  }
}

