import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type DepartmentReadiness = {
  department: string;
  readinessScore: number;
  barPercent: number;
  color: string;
};

export type InstitutionPulseView = {
  predictedPlacementPct: number;
  atRiskCount: number;
  readinessByDepartment: DepartmentReadiness[];
  accreditationWatch: {
    title: string;
    summary: string;
    items: string[];
  };
  weekSummary: {
    papersGenerated: number;
    hoursSaved: number;
    studentsRecovered: number;
  };
  weekOverWeek: {
    placementPctDelta: number;
    atRiskDelta: number;
  };
};

export type AlertItem = {
  id: string;
  type: 'at_risk' | 'approval_needed' | 'recovery_win';
  title: string;
  body: string;
  relativeTime: string;
  severity: 'red' | 'amber' | 'green';
  isRead: boolean;
  ctaLabel: string | null;
  ctaRoute: string | null;
};

export type AlertInboxView = {
  alerts: AlertItem[];
  unreadCount: number;
};

export type MondayDigestView = {
  digest: {
    weekLabel: string;
    papersGenerated: number;
    hoursSaved: number;
    studentsRecovered: number;
    headline: string;
    body: string;
  };
  preferences: {
    inAppEnabled: boolean;
    whatsappEnabled: boolean;
  };
  lastDelivery: Array<{
    channel: 'in_app' | 'whatsapp';
    status: 'delivered' | 'skipped' | 'queued' | 'opted_out';
    deliveredAt: string | null;
    queueId: string | null;
  }>;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const json = (await response.json()) as { data: T };
  return json.data;
}

export async function fetchInstitutionPulse(): Promise<InstitutionPulseView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/dean-pulse`, {
    headers: await getApiHeaders(),
  });
  return parseJson<InstitutionPulseView>(response);
}

export async function fetchAlertInbox(): Promise<AlertInboxView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/alerts`, {
    headers: await getApiHeaders(),
  });
  return parseJson<AlertInboxView>(response);
}

export async function markAlertRead(alertId: string): Promise<AlertItem> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/alerts/${encodeURIComponent(alertId)}/read`, {
    method: 'PATCH',
    headers: await getApiHeaders(),
  });
  return parseJson<AlertItem>(response);
}

export async function fetchMondayDigest(): Promise<MondayDigestView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/dean-pulse/monday-digest`, {
    headers: await getApiHeaders(),
  });
  return parseJson<MondayDigestView>(response);
}

export async function updateMondayDigestPreferences(
  patch: Partial<MondayDigestView['preferences']>,
): Promise<MondayDigestView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/dean-pulse/monday-digest/preferences`, {
    method: 'PATCH',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  return parseJson<MondayDigestView>(response);
}

export async function triggerMondayDigest(): Promise<MondayDigestView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/dean-pulse/monday-digest/trigger`, {
    method: 'POST',
    headers: await getApiHeaders(),
  });
  return parseJson<MondayDigestView>(response);
}

export function formatPlacementDelta(delta: number): string {
  if (delta > 0) return `↑${delta}`;
  if (delta < 0) return `↓${Math.abs(delta)}`;
  return '—';
}

export function formatAtRiskDelta(delta: number): string {
  if (delta < 0) return `↓${Math.abs(delta)}`;
  if (delta > 0) return `↑${delta}`;
  return '—';
}

export function alertSeverityStyle(severity: AlertItem['severity']) {
  switch (severity) {
    case 'red':
      return { borderColor: '#F5C6C6', backgroundColor: '#FFF5F5' };
    case 'amber':
      return { borderColor: '#F5E0B8', backgroundColor: '#FFFBF0' };
    case 'green':
      return { borderColor: '#B8E6D4', backgroundColor: '#F0FBF6' };
  }
}
