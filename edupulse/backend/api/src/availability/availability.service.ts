import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { LogAction } from '../observability/log-action.types';
import { getCorrelationId } from '../observability/correlation-context';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { AuthUser } from '../auth/auth.types';
import type {
  ComponentId,
  DeepHealth,
  ExamWindow,
  Incident,
  MaintenanceWindow,
  SloSummary,
} from './availability.schema';
import { AvailabilityStoreService } from './availability-store.service';
import { ComponentHealthService } from './component-health.service';

const PES_INSTITUTION_ID = '00000000-0000-4000-8000-000000000001';
const MAINTENANCE_NOTICE_HOURS = 48;
const DEFAULT_SLO_TARGET = 99.5;

@Injectable()
export class AvailabilityService implements OnModuleInit {
  constructor(
    private readonly store: AvailabilityStoreService,
    private readonly components: ComponentHealthService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  onModuleInit() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const end = new Date(now);
    end.setDate(end.getDate() + 6);

    this.store.upsertExamWindow({
      id: '40000000-0000-4000-8000-000000000001',
      institutionId: PES_INSTITUTION_ID,
      courseCode: 'BCS304',
      label: 'BCS304 SEE week',
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      sloTargetPct: DEFAULT_SLO_TARGET,
    });
  }

  listExamWindows(user: AuthUser): ExamWindow[] {
    return this.store.listExamWindows(user.institutionId);
  }

  createExamWindow(
    user: AuthUser,
    input: {
      courseCode: string;
      label: string;
      startsAt: string;
      endsAt: string;
      sloTargetPct?: number;
    },
  ): ExamWindow {
    const window: ExamWindow = {
      id: crypto.randomUUID(),
      institutionId: user.institutionId,
      courseCode: input.courseCode.toUpperCase(),
      label: input.label,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      sloTargetPct: input.sloTargetPct ?? DEFAULT_SLO_TARGET,
    };
    this.store.upsertExamWindow(window);
    return window;
  }

  async runDeepHealth(
    user: AuthUser,
    simulateFailure?: ComponentId,
  ): Promise<DeepHealth> {
    const started = Date.now();
    const active = this.store.getActiveExamWindow(user.institutionId);
    const componentResults = await this.components.checkAll(simulateFailure);
    const failed = componentResults.filter((c) => c.status === 'down');

    const inMaintenance = this.store.isInMaintenance(user.institutionId, new Date());

    if (active && !inMaintenance) {
      this.store.recordProbe({
        at: new Date().toISOString(),
        institutionId: user.institutionId,
        examWindowId: active.id,
        allOk: failed.length === 0,
        failedComponents: failed.map((f) => f.id),
      });
    }

    if (active && failed.length > 0 && !inMaintenance) {
      for (const component of failed) {
        const correlationId = getCorrelationId();
        const incident: Incident = {
          id: crypto.randomUUID(),
          institutionId: user.institutionId,
          examWindowId: active.id,
          componentId: component.id,
          correlationId,
          occurredAt: new Date().toISOString(),
          summary: `${component.id} health check failed during ${active.label}`,
          resolved: false,
        };
        this.store.addIncident(incident);

        this.actionLogger.logAction({
          action: LogAction.AvailabilityAlert,
          durationMs: Date.now() - started,
          outcome: 'failure',
          institutionId: user.institutionId,
          userId: user.sub,
          metadata: {
            componentId: component.id,
            examWindowId: active.id,
            correlationId,
          },
        });
      }
    }

    this.actionLogger.logAction({
      action: LogAction.AvailabilityProbe,
      durationMs: Date.now() - started,
      outcome: failed.length === 0 ? 'success' : 'failure',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        examWindowActive: Boolean(active),
        failedCount: failed.length,
        componentsChecked: componentResults.length,
      },
    });

    const slo = active ? this.calculateSlo(user.institutionId, active) : null;

    return {
      checkedAt: new Date().toISOString(),
      examWindowActive: Boolean(active),
      components: componentResults,
      sloPct: slo?.measuredSloPct ?? null,
      sloTargetPct: active?.sloTargetPct ?? null,
    };
  }

  calculateSlo(institutionId: string, window: ExamWindow): SloSummary {
    const probes = this.store.getProbesForWindow(institutionId, window.id);
    const maintenance = this.store.listMaintenance(institutionId).filter((m) => m.excludeFromSlo);

    let maintenanceExcludedMinutes = 0;
    for (const m of maintenance) {
      const start = Math.max(new Date(m.startsAt).getTime(), new Date(window.startsAt).getTime());
      const end = Math.min(new Date(m.endsAt).getTime(), new Date(window.endsAt).getTime());
      if (end > start) {
        maintenanceExcludedMinutes += Math.round((end - start) / 60_000);
      }
    }

    if (probes.length === 0) {
      return {
        windowLabel: window.label,
        sloTargetPct: window.sloTargetPct,
        measuredSloPct: 100,
        probeCount: 0,
        maintenanceExcludedMinutes,
        meetsTarget: true,
      };
    }

    const okCount = probes.filter((p) => p.allOk).length;
    const measuredSloPct = Math.round((okCount / probes.length) * 1000) / 10;

    return {
      windowLabel: window.label,
      sloTargetPct: window.sloTargetPct,
      measuredSloPct,
      probeCount: probes.length,
      maintenanceExcludedMinutes,
      meetsTarget: measuredSloPct >= window.sloTargetPct,
    };
  }

  getSloSummary(user: AuthUser): SloSummary | null {
    const active = this.store.getActiveExamWindow(user.institutionId);
    if (!active) {
      return null;
    }
    return this.calculateSlo(user.institutionId, active);
  }

  scheduleMaintenance(
    user: AuthUser,
    input: { title: string; message: string; startsAt: string; endsAt: string },
  ): MaintenanceWindow {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const minNotice = Date.now() + MAINTENANCE_NOTICE_HOURS * 60 * 60 * 1000;

    if (startsAt.getTime() < minNotice) {
      throw new BadRequestException({
        code: 'MAINTENANCE_NOTICE_TOO_SHORT',
        message: `Maintenance must be announced at least ${MAINTENANCE_NOTICE_HOURS} hours in advance.`,
      });
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException({
        code: 'INVALID_MAINTENANCE_WINDOW',
        message: 'Maintenance end must be after start.',
      });
    }

    const record: MaintenanceWindow = {
      id: crypto.randomUUID(),
      institutionId: user.institutionId,
      title: input.title,
      message: input.message,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      announcedAt: new Date().toISOString(),
      excludeFromSlo: true,
    };

    this.store.addMaintenance(record);

    this.actionLogger.logAction({
      action: LogAction.MaintenanceScheduled,
      durationMs: 0,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        maintenanceId: record.id,
        startsAt: record.startsAt,
        endsAt: record.endsAt,
      },
    });

    return record;
  }

  listMaintenance(user: AuthUser): MaintenanceWindow[] {
    return this.store.listMaintenance(user.institutionId);
  }

  listIncidents(user: AuthUser): Incident[] {
    return this.store.listIncidents(user.institutionId);
  }

  getBanner(user: AuthUser) {
    const now = new Date();

    const maintenance = this.store
      .listMaintenance(user.institutionId)
      .find((m) => now.getTime() <= new Date(m.endsAt).getTime());

    if (maintenance) {
      return {
        visible: true,
        kind: 'maintenance' as const,
        title: maintenance.title,
        message: maintenance.message,
        startsAt: maintenance.startsAt,
      };
    }

    const exam = this.store.getActiveExamWindow(user.institutionId, now);
    if (exam) {
      return {
        visible: true,
        kind: 'exam' as const,
        title: exam.label,
        message: `Exam window active — platform monitored at ${exam.sloTargetPct}% SLO.`,
        startsAt: exam.startsAt,
      };
    }

    return { visible: false, kind: 'none' as const };
  }
}
