import { useConsentStatus } from '@/src/hooks/useConsent';
import { useAuthStore } from '@/src/stores/auth';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

const PUBLIC_SEGMENTS = new Set(['login', 'auth', 'consent']);

/** Redirect authenticated users to consent screen when policy acceptance is required */
export function useConsentGate() {
  const router = useRouter();
  const segments = useSegments();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const root = segments[0] ?? '';
  const inPublicRoute = PUBLIC_SEGMENTS.has(root);

  const { data: status, isLoading, isFetched } = useConsentStatus(
    Boolean(accessToken) && isHydrated && !inPublicRoute,
  );

  useEffect(() => {
    if (!isHydrated || !accessToken) return;

    if (inPublicRoute) {
      if (root === 'login' && isFetched && status?.required) {
        router.replace('/consent');
      }
      return;
    }

    if (isLoading || !isFetched) return;

    if (status?.required) {
      router.replace('/consent');
      return;
    }

    if (root === 'consent' && !status?.required) {
      router.replace('/');
    }
  }, [
    accessToken,
    inPublicRoute,
    isFetched,
    isHydrated,
    isLoading,
    root,
    router,
    status?.required,
  ]);
}
