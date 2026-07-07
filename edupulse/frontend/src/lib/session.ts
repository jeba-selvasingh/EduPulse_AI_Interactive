import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'edupulse.accessToken.v1';
const REFRESH_TOKEN_KEY = 'edupulse.refreshToken.v1';
const USER_KEY = 'edupulse.user.v1';
const PENDING_REDIRECT_KEY = 'edupulse.pendingRedirect.v1';
const LAST_ACTIVITY_KEY = 'edupulse.lastActivityAt.v1';

function isWebStorage(): boolean {
  return Platform.OS === 'web' || (typeof window !== 'undefined' && typeof localStorage !== 'undefined');
}

export type StoredUser = {
  sub: string;
  email: string;
  name: string;
  institutionId: string;
  roles: string[];
};

async function getStoredItem(key: string): Promise<string | null> {
  if (isWebStorage()) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredItem(key: string, value: string): Promise<void> {
  if (isWebStorage()) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // private browsing / quota
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredItem(key: string): Promise<void> {
  if (isWebStorage()) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(
  accessToken: string,
  user: StoredUser,
  refreshToken?: string,
): Promise<void> {
  await setStoredItem(ACCESS_TOKEN_KEY, accessToken);
  await setStoredItem(USER_KEY, JSON.stringify(user));
  await touchSession();
  if (refreshToken) {
    await setStoredItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function loadSession(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  user: StoredUser | null;
}> {
  const accessToken = await getStoredItem(ACCESS_TOKEN_KEY);
  const refreshToken = await getStoredItem(REFRESH_TOKEN_KEY);
  const rawUser = await getStoredItem(USER_KEY);

  return {
    accessToken,
    refreshToken,
    user: rawUser ? (JSON.parse(rawUser) as StoredUser) : null,
  };
}

export async function clearSession(): Promise<void> {
  await deleteStoredItem(ACCESS_TOKEN_KEY);
  await deleteStoredItem(REFRESH_TOKEN_KEY);
  await deleteStoredItem(USER_KEY);
  await deleteStoredItem(LAST_ACTIVITY_KEY);
}

export async function touchSession(): Promise<void> {
  await setStoredItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export async function isSessionExpired(idleTimeoutMs: number): Promise<boolean> {
  const raw = await getStoredItem(LAST_ACTIVITY_KEY);
  if (!raw) return false;
  const last = Number(raw);
  if (!Number.isFinite(last)) return false;
  return Date.now() - last > idleTimeoutMs;
}

export async function setPendingRedirect(path: string): Promise<void> {
  await setStoredItem(PENDING_REDIRECT_KEY, path);
}

export async function consumePendingRedirect(): Promise<string | null> {
  const path = await getStoredItem(PENDING_REDIRECT_KEY);
  if (path) {
    await deleteStoredItem(PENDING_REDIRECT_KEY);
  }
  return path;
}

export async function getAccessToken(): Promise<string | null> {
  return getStoredItem(ACCESS_TOKEN_KEY);
}
