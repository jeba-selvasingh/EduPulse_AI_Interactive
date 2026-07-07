import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type AuditEventType = 'override' | 'approval' | 'edit';

export type AuditEvent = {
  id: string;
  artifactId: string;
  eventType: AuditEventType;
  userId: string;
  userName: string;
  userEmail: string;
  institutionId: string;
  occurredAt: string;
  summary: string;
  field?: string;
  beforeValue?: string;
  afterValue?: string;
};

export type AppendAuditPayload = {
  artifactId: string;
  summary: string;
  field?: string;
  beforeValue?: string;
  afterValue?: string;
};

export async function fetchAuditTrail(artifactId: string): Promise<AuditEvent[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/audit-events/artifact/${artifactId}`, {
    headers: await getApiHeaders(),
  });

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Audit fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: AuditEvent[] };
  return json.data;
}

async function postAudit(
  path: 'override' | 'approve' | 'edit',
  payload: AppendAuditPayload,
): Promise<AuditEvent> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/audit-events/${path}`, {
    method: 'POST',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Audit append failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: AuditEvent };
  return json.data;
}

export function appendOverrideAudit(payload: AppendAuditPayload) {
  return postAudit('override', payload);
}

export function appendApprovalAudit(payload: AppendAuditPayload) {
  return postAudit('approve', payload);
}

export function appendEditAudit(payload: AppendAuditPayload) {
  return postAudit('edit', payload);
}

export function eventTypeLabel(type: AuditEventType): string {
  if (type === 'override') return 'Override';
  if (type === 'approval') return 'Approval';
  return 'Edit';
}
