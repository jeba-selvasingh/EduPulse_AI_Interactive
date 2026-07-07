import { Injectable } from '@nestjs/common';
import type {
  ComponentId,
  ExamWindow,
  Incident,
  MaintenanceWindow,
} from './availability.schema';

export type ProbeRecord = {
  at: string;
  institutionId: string;
  examWindowId: string | null;
  allOk: boolean;
  failedComponents: ComponentId[];
};

@Injectable()
export class AvailabilityStoreService {
  private readonly examWindows = new Map<string, ExamWindow>();
  private readonly maintenanceWindows: MaintenanceWindow[] = [];
  private readonly probes: ProbeRecord[] = [];
  private readonly incidents: Incident[] = [];

  upsertExamWindow(window: ExamWindow): void {
    this.examWindows.set(window.id, window);
  }

  listExamWindows(institutionId: string): ExamWindow[] {
    return [...this.examWindows.values()].filter((w) => w.institutionId === institutionId);
  }

  getActiveExamWindow(institutionId: string, at = new Date()): ExamWindow | null {
    const ts = at.getTime();
    return (
      this.listExamWindows(institutionId).find((w) => {
        const start = new Date(w.startsAt).getTime();
        const end = new Date(w.endsAt).getTime();
        return ts >= start && ts <= end;
      }) ?? null
    );
  }

  addMaintenance(window: MaintenanceWindow): void {
    this.maintenanceWindows.push(window);
  }

  listMaintenance(institutionId: string): MaintenanceWindow[] {
    return this.maintenanceWindows.filter((m) => m.institutionId === institutionId);
  }

  getUpcomingMaintenance(institutionId: string, at = new Date()): MaintenanceWindow | null {
    const ts = at.getTime();
    const upcoming = this.listMaintenance(institutionId)
      .filter((m) => new Date(m.endsAt).getTime() >= ts)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return upcoming[0] ?? null;
  }

  isInMaintenance(institutionId: string, at: Date): boolean {
    const ts = at.getTime();
    return this.listMaintenance(institutionId).some((m) => {
      const start = new Date(m.startsAt).getTime();
      const end = new Date(m.endsAt).getTime();
      return ts >= start && ts <= end;
    });
  }

  recordProbe(probe: ProbeRecord): void {
    this.probes.push(probe);
    if (this.probes.length > 5000) {
      this.probes.splice(0, this.probes.length - 5000);
    }
  }

  getProbesForWindow(institutionId: string, examWindowId: string): ProbeRecord[] {
    return this.probes.filter(
      (p) => p.institutionId === institutionId && p.examWindowId === examWindowId,
    );
  }

  addIncident(incident: Incident): void {
    this.incidents.push(incident);
  }

  listIncidents(institutionId: string): Incident[] {
    return this.incidents
      .filter((i) => i.institutionId === institutionId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }
}
