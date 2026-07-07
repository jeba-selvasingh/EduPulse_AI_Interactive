import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type {
  DriveCalendarDetail,
  DriveCalendarEntry,
  DriveCalendarView,
  DriveReminderResult,
  DriveUrgencyTone,
  UnregisteredEligibleStudent,
} from './drive-calendar.schema';
import { driveReminderRequestSchema } from './drive-calendar.schema';
import { isEligible } from './eligibility.util';
import { PILOT_BATCH_LABEL } from './pilot-placement-students.seed';
import { PILOT_PLACEMENT_STUDENTS } from './pilot-placement-students.seed';
import { PILOT_DRIVE_CALENDAR, type PilotDriveSeed } from './pilot-drive-calendar.seed';
import { WhatsAppReminderQueueService } from './whatsapp-reminder-queue.service';

const WHATSAPP_TEMPLATE_ID = 'drive_registration_reminder_v1';

@Injectable()
export class DriveCalendarService {
  constructor(
    private readonly actionLogger: StructuredLoggerService,
    private readonly whatsappQueue: WhatsAppReminderQueueService,
  ) {}

  getCalendarView(user: AuthUser): DriveCalendarView {
    const started = Date.now();
    const drives = PILOT_DRIVE_CALENDAR.map((seed) => this.toEntry(seed));
    const tcs = drives.find((drive) => drive.driveId === 'tcs-digital');

    const view: DriveCalendarView = {
      monthLabel: 'Aug 2026',
      batchLabel: PILOT_BATCH_LABEL,
      whatsappPilotEnabled: this.isWhatsappPilotEnabled(),
      drives,
      actionAlert:
        tcs && tcs.pendingCount > 0
          ? {
              driveId: tcs.driveId,
              companyName: tcs.companyName,
              pendingCount: tcs.pendingCount,
              registrationClosesLabel: tcs.registrationClosesLabel,
              message: `${tcs.pendingCount} students eligible for ${tcs.companyName} have not registered${
                tcs.registrationClosesLabel
                  ? ` · Registration closes ${tcs.registrationClosesLabel}`
                  : ''
              }`,
            }
          : undefined,
    };

    this.actionLogger.logAction({
      action: LogAction.CampusDriveCalendarView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        driveCount: drives.length,
        actionAlertDriveId: view.actionAlert?.driveId,
      },
    });

    return view;
  }

  getDriveDetail(user: AuthUser, driveId?: string): DriveCalendarDetail {
    const started = Date.now();
    const normalizedId = driveId?.trim();

    if (!normalizedId) {
      throw new BadRequestException('driveId query parameter is required');
    }

    const seed = PILOT_DRIVE_CALENDAR.find((entry) => entry.driveId === normalizedId);
    if (!seed) {
      throw new NotFoundException(`Drive ${normalizedId} not found on calendar`);
    }

    const entry = this.toEntry(seed);
    const unregistered = this.buildUnregisteredEligible(seed);
    const whatsappPilotEnabled = this.isWhatsappPilotEnabled();

    const detail: DriveCalendarDetail = {
      ...entry,
      rules: seed.rules,
      unregisteredEligibleCount: unregistered.totalCount,
      unregisteredEligibleStudents: unregistered.sample,
      whatsappPilotEnabled,
      canSendReminder: whatsappPilotEnabled && entry.pendingCount > 0,
    };

    this.actionLogger.logAction({
      action: LogAction.CampusDriveCalendarDetailView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        driveId: normalizedId,
        pendingCount: entry.pendingCount,
        unregisteredEligibleCount: unregistered.totalCount,
      },
    });

    return detail;
  }

  queueReminder(user: AuthUser, body: unknown): DriveReminderResult {
    const started = Date.now();
    const parsed = driveReminderRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('driveId is required');
    }

    if (!this.isWhatsappPilotEnabled()) {
      throw new BadRequestException('WhatsApp pilot is not enabled for this institution');
    }

    const seed = PILOT_DRIVE_CALENDAR.find((entry) => entry.driveId === parsed.data.driveId);
    if (!seed) {
      throw new NotFoundException(`Drive ${parsed.data.driveId} not found on calendar`);
    }

    const entry = this.toEntry(seed);
    if (entry.pendingCount <= 0) {
      throw new BadRequestException('No unregistered eligible students for this drive');
    }

    const job = this.whatsappQueue.queueReminder({
      driveId: seed.driveId,
      companyName: seed.companyName,
      recipientCount: entry.pendingCount,
      institutionId: user.institutionId,
      requestedByUserId: user.sub,
    });

    this.actionLogger.logAction({
      action: LogAction.CampusDriveReminderQueued,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        driveId: seed.driveId,
        companyName: seed.companyName,
        recipientCount: entry.pendingCount,
        queueId: job.queueId,
        channel: 'whatsapp',
        templateId: WHATSAPP_TEMPLATE_ID,
      },
    });

    return {
      queued: true,
      driveId: seed.driveId,
      companyName: seed.companyName,
      recipientCount: entry.pendingCount,
      queueId: job.queueId,
      channel: 'whatsapp',
      templateId: WHATSAPP_TEMPLATE_ID,
      auditLogAction: LogAction.CampusDriveReminderQueued,
    };
  }

  private toEntry(seed: PilotDriveSeed): DriveCalendarEntry {
    const pendingCount = Math.max(seed.eligibleCount - seed.registeredCount, 0);

    return {
      driveId: seed.driveId,
      companyName: seed.companyName,
      driveDateLabel: seed.driveDateLabel,
      daysUntilDrive: seed.daysUntilDrive,
      packageLabel: seed.packageLabel,
      rulesSummary: seed.rulesSummary,
      scheduleNote: seed.scheduleNote,
      venue: seed.venue,
      registrationStatus: seed.registrationStatus,
      eligibleCount: seed.eligibleCount,
      registeredCount: seed.registeredCount,
      pendingCount,
      registrationOpensLabel: seed.registrationOpensLabel,
      registrationClosesLabel: seed.registrationClosesLabel,
      urgencyTone: this.urgencyTone(seed.daysUntilDrive, pendingCount),
      detailRoute: `/drive-calendar?driveId=${seed.driveId}`,
    };
  }

  private buildUnregisteredEligible(seed: PilotDriveSeed): {
    totalCount: number;
    sample: UnregisteredEligibleStudent[];
  } {
    const eligibleStudents = PILOT_PLACEMENT_STUDENTS.filter((student) =>
      isEligible(student, seed.rules),
    );

    const prototypePending = Math.max(seed.eligibleCount - seed.registeredCount, 0);
    const totalCount = prototypePending > 0 ? prototypePending : 0;

    const sample = eligibleStudents.slice(0, Math.min(8, totalCount)).map((student) => ({
      usn: student.usn,
      name: student.name,
      cgpa: student.cgpa,
    }));

    return { totalCount, sample };
  }

  private urgencyTone(daysUntilDrive: number, pendingCount: number): DriveUrgencyTone {
    if (pendingCount >= 40 && daysUntilDrive <= 14) {
      return 'urgent';
    }
    if (pendingCount > 0 && daysUntilDrive <= 14) {
      return 'attention';
    }
    if (daysUntilDrive <= 21) {
      return 'normal';
    }
    return 'upcoming';
  }

  private isWhatsappPilotEnabled(): boolean {
    const flag = process.env.WHATSAPP_PILOT_ENABLED;
    if (flag === 'false') {
      return false;
    }
    return true;
  }
}
