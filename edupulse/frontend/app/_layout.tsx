import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { MaintenanceBanner } from '@/src/components/MaintenanceBanner';
import { useMaintenanceBanner } from '@/src/hooks/useMaintenanceBanner';
import { useAuthStore } from '@/src/stores/auth';
import { useConsentGate } from '@/src/hooks/useConsentGate';
import { useSessionTimeout } from '@/src/hooks/useSessionTimeout';

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrate = useAuthStore((s) => s.hydrate);
  const { banner, dismiss } = useMaintenanceBanner();

  useSessionTimeout();
  useConsentGate();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup =
      segments[0] === 'login' || segments[0] === 'auth' || segments[0] === 'consent';

    if (!accessToken && !inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (accessToken && segments[0] === 'login') {
      // Consent gate routes to /consent or home after policy check
      return;
    }
  }, [accessToken, isHydrated, router, segments]);

  return (
    <>
      {accessToken ? <MaintenanceBanner banner={banner} onDismiss={dismiss} /> : null}
      {children}
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F7F7FA' },
            animation: 'slide_from_right',
          }}
        />
      </AuthGate>
    </QueryClientProvider>
  );
}
