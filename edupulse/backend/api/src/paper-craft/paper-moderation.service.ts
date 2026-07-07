import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { AppRole } from '../rbac/permissions';
import { ExplainabilityService } from '../explainability/explainability.service';
import { AnswerKeyService } from './answer-key.service';
import { CoPoMappingService } from './co-po-mapping.service';
import { NotificationsStoreService } from './notifications-store.service';
import {
  type PaperModerationRecord,
  approveModerationBodySchema,
  isModerationLocked,
  returnModerationBodySchema,
  submitModerationBodySchema,
} from './paper-moderation.schema';
import { PaperModerationStoreService } from './paper-moderation-store.service';
import { PaperCraftStoreService } from './paper-craft-store.service';

@Injectable()
export class PaperModerationService {
  constructor(
    private readonly papers: PaperCraftStoreService,
    private readonly moderationStore: PaperModerationStoreService,
    private readonly notifications: NotificationsStoreService,
    private readonly answerKeys: AnswerKeyService,
    private readonly coPoMappings: CoPoMappingService,
    private readonly explainability: ExplainabilityService,
  ) {}

  getStatus(user: AuthUser, paperId: string): PaperModerationRecord {
    const paper = this.requirePaper(user, paperId);
    const existing = this.moderationStore.get(paperId);
    if (existing) return existing;

    return this.draftRecord(paper);
  }

  submitForModeration(user: AuthUser, paperId: string, body: unknown): PaperModerationRecord {
    submitModerationBodySchema.parse(body ?? {});
    const paper = this.requirePaper(user, paperId);
    const current = this.moderationStore.get(paperId);

    if (current && isModerationLocked(current.status)) {
      throw new ConflictException({
        code: 'PACKAGE_ALREADY_SUBMITTED',
        message: 'Paper package is already submitted or approved',
      });
    }

    try {
      this.answerKeys.getAnswerKey(user, paperId);
    } catch {
      throw new BadRequestException({
        code: 'ANSWER_KEY_REQUIRED',
        message: 'Generate the answer key before submitting for moderation',
      });
    }

    const mapping = this.coPoMappings.getMapping(user, paperId);
    if (!mapping.readyForSubmit) {
      throw new BadRequestException({
        code: 'CO_PO_COVERAGE_INCOMPLETE',
        message: 'Resolve under-represented CO coverage before submitting',
      });
    }

    const record: PaperModerationRecord = {
      paperId: paper.id,
      institutionId: paper.institutionId,
      courseCode: paper.courseCode,
      examType: paper.examType,
      trustCardId: paper.trustCardId,
      status: 'submitted',
      submittedBy: user.sub,
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      changeComments: null,
      isLocked: true,
      answerSheetUnlocked: false,
    };

    this.moderationStore.save(record);

    this.notifications.create({
      institutionId: paper.institutionId,
      paperId: paper.id,
      kind: 'moderation_submitted',
      title: `${paper.examType} paper awaiting moderation`,
      body: `${paper.courseCode} question paper package submitted by ${user.name} for CoE review.`,
      recipientRoles: [AppRole.Moderator, AppRole.Principal],
    });

    return record;
  }

  approvePackage(user: AuthUser, paperId: string, body: unknown): PaperModerationRecord {
    approveModerationBodySchema.parse(body ?? {});
    const paper = this.requirePaper(user, paperId);
    const current = this.requireSubmitted(paperId);

    const record: PaperModerationRecord = {
      ...current,
      status: 'approved',
      reviewedBy: user.sub,
      reviewedAt: new Date().toISOString(),
      changeComments: null,
      isLocked: true,
      answerSheetUnlocked: true,
    };

    this.moderationStore.save(record);

    this.explainability.appendAuditEvent(user, {
      artifactId: paper.trustCardId,
      eventType: 'approval',
      summary: `${user.name} approved ${paper.examType} paper package for ${paper.courseCode}`,
      field: 'moderationStatus',
      beforeValue: 'submitted',
      afterValue: 'approved',
    });

    if (current.submittedBy) {
      this.notifications.create({
        institutionId: paper.institutionId,
        paperId: paper.id,
        kind: 'moderation_approved',
        title: 'Paper package approved',
        body: `${paper.courseCode} ${paper.examType} passed moderation. Answer Sheet AI is now unlocked.`,
        recipientUserId: current.submittedBy,
      });
    }

    return record;
  }

  returnForChanges(user: AuthUser, paperId: string, body: unknown): PaperModerationRecord {
    const parsed = returnModerationBodySchema.parse(body);
    const paper = this.requirePaper(user, paperId);
    const current = this.requireSubmitted(paperId);

    const record: PaperModerationRecord = {
      ...current,
      status: 'returned',
      reviewedBy: user.sub,
      reviewedAt: new Date().toISOString(),
      changeComments: parsed.comments.trim(),
      isLocked: false,
      answerSheetUnlocked: false,
    };

    this.moderationStore.save(record);

    if (current.submittedBy) {
      this.notifications.create({
        institutionId: paper.institutionId,
        paperId: paper.id,
        kind: 'moderation_returned',
        title: 'Moderator requested changes',
        body: parsed.comments.trim(),
        recipientUserId: current.submittedBy,
      });
    }

    return record;
  }

  assertPackageEditable(paperId: string): void {
    if (this.moderationStore.isPackageLocked(paperId)) {
      throw new ConflictException({
        code: 'PACKAGE_LOCKED',
        message: 'Paper package is locked while awaiting moderation or after approval',
      });
    }
  }

  getEvaluationAccess(user: AuthUser, paperId: string) {
    const paper = this.requirePaper(user, paperId);
    const record = this.moderationStore.get(paperId);
    const unlocked = this.moderationStore.isAnswerSheetUnlocked(paperId);

    return {
      paperId: paper.id,
      courseCode: paper.courseCode,
      examType: paper.examType,
      moderationStatus: record?.status ?? 'draft',
      unlocked,
      message: unlocked
        ? 'Answer Sheet AI workflow unlocked for this exam'
        : 'Complete moderation approval to unlock Answer Sheet AI',
    };
  }

  listNotifications(user: AuthUser) {
    return this.notifications.listForUser(user);
  }

  private requirePaper(user: AuthUser, paperId: string) {
    const paper = this.papers.getById(paperId);
    if (!paper || paper.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'PAPER_NOT_FOUND',
        message: 'Generated question paper not found',
      });
    }
    return paper;
  }

  private requireSubmitted(paperId: string): PaperModerationRecord {
    const current = this.moderationStore.get(paperId);
    if (!current || current.status !== 'submitted') {
      throw new BadRequestException({
        code: 'INVALID_MODERATION_STATE',
        message: 'Paper package must be in submitted state for this action',
      });
    }
    return current;
  }

  private draftRecord(paper: {
    id: string;
    institutionId: string;
    courseCode: string;
    examType: string;
    trustCardId: string;
  }): PaperModerationRecord {
    return {
      paperId: paper.id,
      institutionId: paper.institutionId,
      courseCode: paper.courseCode,
      examType: paper.examType,
      trustCardId: paper.trustCardId,
      status: 'draft',
      submittedBy: null,
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      changeComments: null,
      isLocked: false,
      answerSheetUnlocked: false,
    };
  }
}
