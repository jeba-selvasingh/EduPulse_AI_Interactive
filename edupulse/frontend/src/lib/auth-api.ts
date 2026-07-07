import { getApiBaseUrl } from '@/src/lib/api';
import type { AuthConfig, LoginResponse } from '@/src/lib/auth';

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/config`);
  if (!response.ok) {
    throw new Error('Failed to load auth config');
  }
  return response.json() as Promise<AuthConfig>;
}

export async function loginWithPassword(
  email: string,
  password: string,
  institutionId: string,
): Promise<LoginResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, institutionId }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Invalid email or password. Please try again.');
  }

  return response.json() as Promise<LoginResponse>;
}

export async function exchangeSsoCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<LoginResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/sso/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri, codeVerifier }),
  });

  if (!response.ok) {
    throw new Error('College SSO sign-in failed. Please try again.');
  }

  return response.json() as Promise<LoginResponse>;
}

export async function fetchMe(accessToken: string): Promise<LoginResponse['user']> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Session invalid');
  }

  return response.json() as Promise<LoginResponse['user']>;
}
