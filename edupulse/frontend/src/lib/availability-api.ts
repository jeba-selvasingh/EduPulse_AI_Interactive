import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type AvailabilityBanner = {
  visible: boolean;
  kind: 'maintenance' | 'exam' | 'none';
  title?: string;
  message?: string;
  startsAt?: string;
};

export type ComponentHealth = {
  id: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs: number;
  message?: string;
};

export type DeepHealth = {
  checkedAt: string;
  examWindowActive: boolean;
  components: ComponentHealth[];
  sloPct: number | null;
  sloTargetPct: number | null;
};

export type SloSummary = {
  windowLabel: string | null;
  sloTargetPct: number;
  measuredSloPct: number;
  probeCount: number;
  maintenanceExcludedMinutes: number;
  meetsTarget: boolean;
};

export type MaintenanceWindow = {
  id: string;
  title: string;
  message: string;
  startsAt: string;
  endsAt: string;
  announcedAt: string;
  excludeFromSlo: boolean;
};

export type Incident = {
  id: string;
  examWindowId: string;
  componentId: string;
  correlationId: string;
  occurredAt: string;
  summary: string;
  resolved: boolean;
};

export type ExamWindow = {
  id: string;
  courseCode: string;
  label: string;
  startsAt: string;
  endsAt: string;
  sloTargetPct: number;
};

export async function fetchAvailabilityBanner(): Promise<AvailabilityBanner> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/availability/banner`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Banner fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: AvailabilityBanner };
  return json.data;
}

export async function fetchDeepHealth(simulateFailure?: string): Promise<DeepHealth> {
  const baseUrl = getApiBaseUrl();
  const query = simulateFailure ? `?simulateFailure=${encodeURIComponent(simulateFailure)}` : '';
  const response = await fetch(`${baseUrl}/api/availability/health/deep${query}`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Deep health failed: ${response.status}`);
  const json = (await response.json()) as { data: DeepHealth };
  return json.data;
}

export async function fetchSloSummary(): Promise<SloSummary | null> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/availability/slo`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`SLO fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: SloSummary | null };
  return json.data;
}

export async function fetchExamWindows(): Promise<ExamWindow[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/availability/exam-windows`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Exam windows failed: ${response.status}`);
  const json = (await response.json()) as { data: ExamWindow[] };
  return json.data;
}

export async function fetchMaintenanceWindows(): Promise<MaintenanceWindow[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/availability/maintenance`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Maintenance list failed: ${response.status}`);
  const json = (await response.json()) as { data: MaintenanceWindow[] };
  return json.data;
}

export async function scheduleMaintenance(input: {
  title: string;
  message: string;
  startsAt: string;
  endsAt: string;
}): Promise<MaintenanceWindow> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/availability/maintenance`, {
    method: 'POST',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Schedule failed: ${response.status}`);
  }
  const json = (await response.json()) as { data: MaintenanceWindow };
  return json.data;
}

export async function fetchIncidents(): Promise<Incident[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/availability/incidents`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Incidents fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: Incident[] };
  return json.data;
}
