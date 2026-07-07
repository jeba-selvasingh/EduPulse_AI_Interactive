import { APP_NAME, BRAND_PRIMARY, BRAND_PRIMARY_LIGHT } from '@/src/constants/theme';
import { InstitutionPicker } from '@/src/components/InstitutionPicker';
import { loginWithPassword, fetchAuthConfig } from '@/src/lib/auth-api';
import { resolveHomeRoute } from '@/src/lib/auth';
import { fetchInstitutions } from '@/src/lib/institutions';
import { setPendingRedirect } from '@/src/lib/session';
import { useAuthStore } from '@/src/stores/auth';
import { useInstitutionStore } from '@/src/stores/institution';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const selected = useInstitutionStore((s) => s.selected);
  const setSelected = useInstitutionStore((s) => s.setSelected);
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState(false);

  const { data: institutions = [], isLoading, error } = useQuery({
    queryKey: ['institutions'],
    queryFn: fetchInstitutions,
  });

  const credentialsEnabled = Boolean(selected);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select an institution');
      return loginWithPassword(email.trim(), password, selected.id);
    },
    onSuccess: async (session) => {
      await setSession(session.accessToken, session.user, session.refreshToken);
      router.replace('/consent');
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const onSignIn = useCallback(() => {
    setFormError(null);
    loginMutation.mutate();
  }, [loginMutation]);

  const onSso = useCallback(async () => {
    if (!selected) return;

    setFormError(null);
    setSsoLoading(true);

    try {
      const config = await fetchAuthConfig();
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'edupulse',
        path: 'auth/callback',
      });

      const request = new AuthSession.AuthRequest({
        clientId: config.clientId,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
      });

      await setPendingRedirect(resolveHomeRoute(['faculty']));

      const result = await request.promptAsync({
        authorizationEndpoint: `${config.keycloakUrl}/realms/${config.realm}/protocol/openid-connect/auth`,
      });

      if (result.type === 'success' && result.params.code && request.codeVerifier) {
        const { exchangeSsoCode } = await import('@/src/lib/auth-api');
        const session = await exchangeSsoCode(
          result.params.code,
          redirectUri,
          request.codeVerifier,
        );
        await setSession(session.accessToken, session.user, session.refreshToken);
        router.replace('/consent');
      } else if (result.type === 'error') {
        setFormError('College SSO sign-in failed. Please try again.');
      }
    } catch {
      setFormError('College SSO is unavailable. Use email sign-in or try later.');
    } finally {
      setSsoLoading(false);
    }
  }, [router, selected, setSession]);

  const busy = loginMutation.isPending || ssoLoading;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.body}>
          <Text style={styles.universityLabel}>UNIVERSITY</Text>
          <View style={styles.logo}>
            <Text style={styles.logoText}>EP</Text>
          </View>
          <Text style={styles.title}>{selected?.name ?? APP_NAME}</Text>
          <Text style={styles.hint}>
            {selected
              ? 'Sign in with your college credentials'
              : 'Select institution · then sign in with college SSO'}
          </Text>

          <InstitutionPicker
            institutions={institutions}
            selected={selected}
            onSelect={setSelected}
            loading={isLoading}
            error={error ? 'Could not load institutions. Check API connection.' : null}
          />

          <View style={styles.field}>
            <Text style={styles.fieldIcon}>✉</Text>
            <TextInput
              style={styles.input}
              placeholder="name@pes.edu"
              placeholderTextColor="#AAA"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={credentialsEnabled && !busy}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#AAA"
              secureTextEntry
              editable={credentialsEnabled && !busy}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, (!credentialsEnabled || busy) && styles.btnDisabled]}
            onPress={onSignIn}
            disabled={!credentialsEnabled || busy}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign in →</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.outlineBtn, (!credentialsEnabled || busy) && styles.btnDisabled]}
            onPress={onSso}
            disabled={!credentialsEnabled || busy}
          >
            {ssoLoading ? (
              <ActivityIndicator color={BRAND_PRIMARY} />
            ) : (
              <Text style={styles.outlineBtnText}>College SSO (Keycloak)</Text>
            )}
          </Pressable>

          <Text style={styles.footer}>Secured by Keycloak · On-premise · DPDP compliant</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#E8E8EE',
    alignItems: 'center',
  },
  phoneShell: {
    flex: 1,
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFF',
  },
  back: {
    padding: 16,
  },
  backText: {
    fontSize: 22,
    color: BRAND_PRIMARY,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  universityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_PRIMARY,
    letterSpacing: 1,
    marginBottom: 20,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: BRAND_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: BRAND_PRIMARY,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F7F7FA',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E8',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 10,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    color: '#1A1A2E',
  },
  formError: {
    color: '#B3261E',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: BRAND_PRIMARY,
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 32,
    fontSize: 10,
    color: '#AAA',
    textAlign: 'center',
  },
});
