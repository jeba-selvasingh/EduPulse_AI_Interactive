const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export type HealthResponse = {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
};

export function getApiBaseUrl(): string {
  return API_URL;
}

export function getInstitutionHeaders(institutionId?: string): HeadersInit {
  const id = institutionId ?? '';
  if (!id) {
    return {};
  }

  return { 'X-Institution-Id': id };
}

export async function getApiHeaders(institutionId?: string): Promise<HeadersInit> {
  const { getAccessToken } = await import('@/src/lib/session');
  const token = await getAccessToken();

  return {
    ...getInstitutionHeaders(institutionId),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchHealth(): Promise<HealthResponse> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
