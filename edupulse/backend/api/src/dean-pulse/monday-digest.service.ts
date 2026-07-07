import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { DigestPreferencesStoreService } from './digest-preferences-store.service';
import type {
  DigestPreferences,
  MondayDigestView,
} from './monday-digest.schema';
import { PILOT_INSTITUTION_PULSE } from './pilot-institution-pulse.seed';
import { WhatsAppDigestQueueService } from './whatsapp-digest-queue.service';

@Injectable()
export class MondayDigestService {
  constructor(
    private readonly prefsStore: DigestPreferencesStoreService,
    private readonly whatsappQueue: WhatsAppDigestQueueService,
    private readonly config: ConfigService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  private isWhatsAppPilotEnabled(): boolean {
    return this.config.get<string>('WHATSAPP_PILOT_ENABLED', 'true') !== 'false';
  }

  private buildDigestContent() {
    const { weekSummary } = PILOT_INSTITUTION_PULSE;
    const headline = `Monday digest · ${weekSummary.papersGenerated} papers · ${weekSummary.hoursSaved}h saved`;
    const body = `This week: ${weekSummary.papersGenerated} papers generated, ${weekSummary.hoursSaved} faculty hours saved, ${weekSummary.studentsRecovered} students recovered from at-risk.`;
    return {
      weekLabel: 'Week of 7 Jul 2026',
      papersGenerated: weekSummary.papersGenerated,
      hoursSaved: weekSummary.hoursSaved,
      studentsRecovered: weekSummary.studentsRecovered,
      headline,
      body,
    };
  }

  getView(user: AuthUser): MondayDigestView {
    const started = Date.now();
    const preferences = this.prefsStore.get(user.sub);
    const digest = this.buildDigestContent();
    const lastDelivery = this.buildLastDelivery(user, preferences, digest.headline);

    this.actionLogger.logAction({
      action: LogAction.MondayDigestView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { inAppEnabled: preferences.inAppEnabled },
    });

    return { digest, preferences, lastDelivery };
  }

  private buildLastDelivery(
    user: AuthUser,
    preferences: DigestPreferences,
    headline: string,
  ): MondayDigestView['lastDelivery'] {
    const deliveries: MondayDigestView['lastDelivery'] = [];

    if (preferences.inAppEnabled) {
      deliveries.push({
        channel: 'in_app',
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        queueId: null,
      });
    } else {
      deliveries.push({
        channel: 'in_app',
        status: 'opted_out',
        deliveredAt: null,
        queueId: null,
      });
    }

    if (!this.isWhatsAppPilotEnabled()) {
      deliveries.push({
        channel: 'whatsapp',
        status: 'skipped',
        deliveredAt: null,
        queueId: null,
      });
      return deliveries;
    }

    if (preferences.whatsappEnabled) {
      const existing = this.whatsappQueue.listForUser(user.sub).at(-1);
      if (existing) {
        deliveries.push({
          channel: 'whatsapp',
          status: 'queued',
          deliveredAt: existing.queuedAt,
          queueId: existing.queueId,
        });
      } else {
        deliveries.push({
          channel: 'whatsapp',
          status: 'skipped',
          deliveredAt: null,
          queueId: null,
        });
      }
    } else {
      deliveries.push({
        channel: 'whatsapp',
        status: 'opted_out',
        deliveredAt: null,
        queueId: null,
      });
    }

    return deliveries;
  }

  updatePreferences(
    user: AuthUser,
    patch: Partial<DigestPreferences>,
  ): MondayDigestView {
    this.prefsStore.update(user.sub, patch);
    this.actionLogger.logAction({
      action: LogAction.MondayDigestPreferencesUpdate,
      durationMs: 0,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: patch,
    });
    return this.getView(user);
  }

  triggerWeeklyDelivery(user: AuthUser): MondayDigestView {
    const preferences = this.prefsStore.get(user.sub);
    const digest = this.buildDigestContent();

    if (
      this.isWhatsAppPilotEnabled() &&
      preferences.whatsappEnabled
    ) {
      this.whatsappQueue.queueDigest({
        institutionId: user.institutionId,
        recipientUserId: user.sub,
        headline: digest.headline,
      });
    }

    this.actionLogger.logAction({
      action: LogAction.MondayDigestTrigger,
      durationMs: 0,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        whatsappEnabled: preferences.whatsappEnabled,
        pilotEnabled: this.isWhatsAppPilotEnabled(),
      },
    });

    return this.getView(user);
  }
}
