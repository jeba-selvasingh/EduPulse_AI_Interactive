import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/stores/auth';
import { touchSession, isSessionExpired } from '@/src/lib/session';

const DEFAULT_IDLE_MS = 8 * 60 * 60 * 1000; // 8 hours (FR-3 / Story 1.4)

function getIdleTimeoutMs(): number {
  const raw = process.env.EXPO_PUBLIC_SESSION_IDLE_MS;
  if (!raw) return DEFAULT_IDLE_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_IDLE_MS;
}

/**
 * Logs user out when idle period exceeds configured timeout (default 8h).
 */
export function useSessionTimeout() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!accessToken) return;

    void touchSession();

    const onActivity = () => {
      void touchSession();
    };

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        void (async () => {
          if (await isSessionExpired(getIdleTimeoutMs())) {
            await logout();
            router.replace('/login');
          } else {
            void touchSession();
          }
        })();
      }
      appState.current = next;
    });

    const interval = setInterval(async () => {
      if (await isSessionExpired(getIdleTimeoutMs())) {
        await logout();
        router.replace('/login');
      }
    }, 60_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [accessToken, logout, router]);
}

export function recordUserActivity() {
  void touchSession();
}
