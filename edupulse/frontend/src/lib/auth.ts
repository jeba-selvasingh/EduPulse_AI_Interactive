import type { StoredUser } from '@/src/lib/session';

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: StoredUser;
};

export type AuthConfig = {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  redirectUri: string;
};

export function resolveHomeRoute(roles: string[]): string {
  if (roles.includes('principal')) {
    return '/dean-pulse';
  }
  if (roles.includes('tpo')) {
    return '/campus-drive';
  }
  if (roles.includes('student')) {
    return '/';
  }
  return '/';
}
