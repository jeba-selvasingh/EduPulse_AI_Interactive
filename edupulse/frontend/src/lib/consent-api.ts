import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type ConsentPolicySection = {
  heading: string;
  body: string;
};

export type ConsentPolicy = {
  version: string;
  title: string;
  summary: string;
  sections: ConsentPolicySection[];
  retentionPolicy: string;
  effectiveAt: string;
};

export type ConsentStatus = {
  required: boolean;
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
};

export async function fetchConsentPolicy(): Promise<ConsentPolicy> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/consent/policy`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Consent policy fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: ConsentPolicy };
  return json.data;
}

export async function fetchConsentStatus(): Promise<ConsentStatus> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/consent/status`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Consent status fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: ConsentStatus };
  return json.data;
}

export async function acceptConsent(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/consent/accept`, {
    method: 'POST',
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Consent accept failed: ${response.status}`);
  }
}

export async function declineConsent(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/consent/decline`, {
    method: 'POST',
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Consent decline failed: ${response.status}`);
  }
}
