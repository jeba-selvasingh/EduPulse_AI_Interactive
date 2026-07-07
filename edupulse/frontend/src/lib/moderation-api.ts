import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type ModerationStatus = 'draft' | 'submitted' | 'approved' | 'returned';

export type PaperModerationRecord = {
  paperId: string;
  courseCode: string;
  examType: string;
  trustCardId: string;
  status: ModerationStatus;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  changeComments: string | null;
  isLocked: boolean;
  answerSheetUnlocked: boolean;
};

export type EvaluationAccess = {
  paperId: string;
  courseCode: string;
  examType: string;
  moderationStatus: ModerationStatus;
  unlocked: boolean;
  message: string;
};

export type InAppNotification = {
  id: string;
  paperId: string;
  kind: 'moderation_submitted' | 'moderation_approved' | 'moderation_returned';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export async function fetchModerationStatus(paperId: string): Promise<PaperModerationRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/moderation`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperModerationRecord };
  return json.data;
}

export async function submitPaperForModeration(
  paperId: string,
  note?: string,
): Promise<PaperModerationRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/moderation/submit`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note }),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperModerationRecord };
  return json.data;
}

export async function approvePaperModeration(
  paperId: string,
  note?: string,
): Promise<PaperModerationRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/moderation/approve`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note }),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperModerationRecord };
  return json.data;
}

export async function returnPaperModeration(
  paperId: string,
  comments: string,
): Promise<PaperModerationRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/moderation/return`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comments }),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperModerationRecord };
  return json.data;
}

export async function fetchEvaluationAccess(paperId: string): Promise<EvaluationAccess> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/evaluation-access`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: EvaluationAccess };
  return json.data;
}

export async function fetchNotifications(): Promise<InAppNotification[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/notifications`, {
    headers: await getApiHeaders(),
  });

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: InAppNotification[] };
  return json.data;
}
