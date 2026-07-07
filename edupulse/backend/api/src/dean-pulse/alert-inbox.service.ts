import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { AlertInboxView, AlertItem } from './alert-inbox.schema';
import { AlertInboxStoreService } from './alert-inbox-store.service';
import { PILOT_ALERTS } from './pilot-alerts.seed';

@Injectable()
export class AlertInboxService {
  constructor(
    private readonly store: AlertInboxStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  listForUser(user: AuthUser): AlertInboxView {
    const started = Date.now();
    const roles = new Set(user.roles);
    const visible = PILOT_ALERTS.filter(
      (alert) =>
        alert.institutionId === user.institutionId &&
        alert.visibleToRoles.some((role) => roles.has(role)),
    );

    const alerts: AlertItem[] = visible.map((seed) => ({
      id: seed.id,
      type: seed.type,
      title: seed.title,
      body: seed.body,
      relativeTime: seed.relativeTime,
      severity: seed.severity,
      isRead: this.store.isRead(user.sub, seed.id),
      ctaLabel: seed.ctaLabel,
      ctaRoute: seed.ctaRoute,
    }));

    const unreadCount = this.store.unreadCount(
      user.sub,
      alerts.map((a) => a.id),
    );

    this.actionLogger.logAction({
      action: LogAction.AlertInboxView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { alertCount: alerts.length, unreadCount },
    });

    return { alerts, unreadCount };
  }

  getUnreadCount(user: AuthUser): number {
    const { unreadCount } = this.listForUser(user);
    return unreadCount;
  }

  markRead(user: AuthUser, alertId: string): AlertItem {
    const roles = new Set(user.roles);
    const seed = PILOT_ALERTS.find(
      (a) =>
        a.id === alertId &&
        a.institutionId === user.institutionId &&
        a.visibleToRoles.some((role) => roles.has(role)),
    );

    if (!seed) {
      throw new NotFoundException('Alert not found');
    }

    this.store.markRead(user.sub, alertId);

    this.actionLogger.logAction({
      action: LogAction.AlertMarkRead,
      durationMs: 0,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { alertId },
    });

    return {
      id: seed.id,
      type: seed.type,
      title: seed.title,
      body: seed.body,
      relativeTime: seed.relativeTime,
      severity: seed.severity,
      isRead: true,
      ctaLabel: seed.ctaLabel,
      ctaRoute: seed.ctaRoute,
    };
  }
}
