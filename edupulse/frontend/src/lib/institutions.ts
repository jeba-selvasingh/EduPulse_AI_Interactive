import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type InstitutionSummary = {
  id: string;
  name: string;
  code: string;
};

export type InstitutionListResponse = {
  data: InstitutionSummary[];
};

export async function fetchInstitutions(): Promise<InstitutionSummary[]> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  const response = await fetch(`${baseUrl}/api/institutions`);
  if (!response.ok) {
    throw new Error(`Failed to load institutions: ${response.status}`);
  }

  const body = (await response.json()) as InstitutionListResponse;
  return body.data;
}

export async function fetchInstitutionById(id: string): Promise<InstitutionSummary> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  const response = await fetch(`${baseUrl}/api/institutions/${id}`, {
    headers: await getApiHeaders(id),
  });

  if (!response.ok) {
    throw new Error(`Failed to load institution: ${response.status}`);
  }

  return response.json() as Promise<InstitutionSummary>;
}
