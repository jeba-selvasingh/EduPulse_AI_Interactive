import { exchangeSsoCode, fetchAuthConfig } from '@/src/lib/auth-api';
import { resolveHomeRoute } from '@/src/lib/auth';
import { consumePendingRedirect } from '@/src/lib/session';
import { useAuthStore } from '@/src/stores/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; state?: string }>();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      try {
        const code = typeof params.code === 'string' ? params.code : undefined;
        if (!code) {
          throw new Error('Missing authorization code');
        }

        const verifier = typeof params.state === 'string' ? params.state : '';
        if (!verifier) {
          throw new Error('Missing PKCE verifier');
        }

        const config = await fetchAuthConfig();
        const session = await exchangeSsoCode(code, config.redirectUri, verifier);

        if (cancelled) return;

        await setSession(session.accessToken, session.user, session.refreshToken);

        const pending = await consumePendingRedirect();
        const route = pending ?? resolveHomeRoute(session.user.roles);
        router.replace(route as '/');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'SSO failed');
        }
      }
    }

    void complete();

    return () => {
      cancelled = true;
    };
  }, [params.code, params.state, router, setSession]);

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color="#534AB7" />
          <Text style={styles.text}>Completing college SSO…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7FA',
    padding: 24,
  },
  text: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  error: {
    color: '#B3261E',
    textAlign: 'center',
    fontSize: 14,
  },
});
