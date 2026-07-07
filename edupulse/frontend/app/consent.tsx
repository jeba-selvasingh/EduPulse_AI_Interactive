import { BRAND_PRIMARY } from '@/src/constants/theme';
import { acceptConsent, declineConsent } from '@/src/lib/consent-api';
import { resolveHomeRoute } from '@/src/lib/auth';
import { useConsentPolicy } from '@/src/hooks/useConsent';
import { useAuthStore } from '@/src/stores/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConsentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: policy, isLoading, error } = useConsentPolicy();
  const [busy, setBusy] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: acceptConsent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['consent-status'] });
      const route = resolveHomeRoute(user?.roles ?? []);
      router.replace(route as '/');
    },
  });

  const onAccept = useCallback(() => {
    setBusy(true);
    acceptMutation.mutate(undefined, {
      onSettled: () => setBusy(false),
    });
  }, [acceptMutation]);

  const onDeclineConfirmed = useCallback(async () => {
    setBusy(true);
    try {
      await declineConsent();
      await logout();
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }, [logout, router]);

  const onDecline = useCallback(() => {
    Alert.alert(
      'Decline data processing?',
      'You will be signed out and cannot access marks, answer sheets, or other confidential academic data until you accept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline & sign out', style: 'destructive', onPress: () => void onDeclineConfirmed() },
      ],
    );
  }, [onDeclineConfirmed]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !policy) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.phoneShell}>
          <Text style={styles.errorText}>Could not load the data processing notice.</Text>
          <Pressable style={styles.outlineBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.outlineBtnText}>Back to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Text style={styles.title}>{policy.title}</Text>
          <Text style={styles.version}>Version {policy.version}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.summary}>{policy.summary}</Text>

          {policy.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}

          <View style={styles.retentionBox}>
            <Text style={styles.retentionLabel}>Retention</Text>
            <Text style={styles.retentionBody}>{policy.retentionPolicy}</Text>
          </View>

          <Text style={styles.legal}>
            By accepting, you consent to processing of your academic data as described above,
            in accordance with the Digital Personal Data Protection Act (DPDP), 2023.
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={onAccept}
            disabled={busy}
          >
            {acceptMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>I accept — continue</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.outlineBtn, busy && styles.btnDisabled]}
            onPress={onDecline}
            disabled={busy}
          >
            <Text style={styles.outlineBtnText}>Decline</Text>
          </Pressable>
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
  loader: { marginTop: 48 },
  hdr: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  version: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 8,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
    color: '#333',
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_PRIMARY,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
  },
  retentionBox: {
    backgroundColor: '#F7F7FA',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  retentionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 4,
  },
  retentionBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#555',
  },
  legal: {
    fontSize: 11,
    lineHeight: 17,
    color: '#888',
    marginTop: 8,
  },
  actions: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
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
    borderColor: '#CCC',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  btnDisabled: { opacity: 0.5 },
  errorText: {
    textAlign: 'center',
    color: '#B3261E',
    margin: 24,
    fontSize: 14,
  },
});
