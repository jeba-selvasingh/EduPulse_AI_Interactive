import {
  fetchMondayDigest,
  triggerMondayDigest,
  updateMondayDigestPreferences,
  type MondayDigestView,
} from '@/src/lib/dean-pulse-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { AccessDenied } from '@/src/components/AccessDenied';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function DeliveryRow({
  channel,
  status,
}: {
  channel: string;
  status: MondayDigestView['lastDelivery'][number]['status'];
}) {
  const label =
    status === 'delivered'
      ? 'Delivered'
      : status === 'queued'
        ? 'Queued (WhatsApp pilot)'
        : status === 'opted_out'
          ? 'Opted out'
          : 'Skipped';
  return (
    <View style={styles.deliveryRow}>
      <Text style={styles.deliveryChannel}>{channel === 'in_app' ? 'In-app' : 'WhatsApp'}</Text>
      <Text style={styles.deliveryStatus}>{label}</Text>
    </View>
  );
}

export function MondayDigestPanel() {
  const router = useRouter();
  const allowed = usePermission(Permission.DeanPulseRead);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['monday-digest'],
    queryFn: fetchMondayDigest,
    enabled: allowed,
  });

  const prefsMutation = useMutation({
    mutationFn: updateMondayDigestPreferences,
    onSuccess: (view) => {
      queryClient.setQueryData(['monday-digest'], view);
      void queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: triggerMondayDigest,
    onSuccess: (view) => {
      queryClient.setQueryData(['monday-digest'], view);
    },
  });

  if (!allowed) {
    return <AccessDenied featureName="Monday digest" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
        ) : error || !data ? (
          <Text style={styles.error}>Could not load Monday digest.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Monday digest</Text>
            <Text style={styles.weekLabel}>{data.digest.weekLabel}</Text>

            <View style={styles.heroCard}>
              <Text style={styles.headline}>{data.digest.headline}</Text>
              <Text style={styles.body}>{data.digest.body}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.digest.papersGenerated}</Text>
                <Text style={styles.statLabel}>Papers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.digest.hoursSaved}</Text>
                <Text style={styles.statLabel}>Hours saved</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.digest.studentsRecovered}</Text>
                <Text style={styles.statLabel}>Recovered</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Delivery channels</Text>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>In-app digest</Text>
                <Switch
                  value={data.preferences.inAppEnabled}
                  onValueChange={(inAppEnabled) =>
                    prefsMutation.mutate({ inAppEnabled })
                  }
                  trackColor={{ true: BRAND_PRIMARY }}
                />
              </View>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>WhatsApp pilot</Text>
                <Switch
                  value={data.preferences.whatsappEnabled}
                  onValueChange={(whatsappEnabled) =>
                    prefsMutation.mutate({ whatsappEnabled })
                  }
                  trackColor={{ true: BRAND_PRIMARY }}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Last delivery</Text>
              {data.lastDelivery.map((d) => (
                <DeliveryRow key={d.channel} channel={d.channel} status={d.status} />
              ))}
            </View>

            <Pressable
              style={[styles.triggerBtn, triggerMutation.isPending && styles.triggerDisabled]}
              onPress={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending}
            >
              <Text style={styles.triggerText}>
                {triggerMutation.isPending ? 'Sending…' : 'Send weekly digest now'}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  back: { padding: 16 },
  backText: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  loader: { marginTop: 40 },
  error: { color: '#B3261E', marginTop: 20, paddingHorizontal: 16 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  weekLabel: { fontSize: 12, color: '#888', marginTop: -4 },
  heroCard: {
    backgroundColor: '#EEEDFE',
    borderRadius: 10,
    padding: 14,
  },
  headline: { fontSize: 14, fontWeight: '700', color: '#3C3489', marginBottom: 6 },
  body: { fontSize: 12, color: '#555', lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: BRAND_PRIMARY },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8, color: '#1A1A2E' },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  prefLabel: { fontSize: 13, color: '#444' },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  deliveryChannel: { fontSize: 12, color: '#666' },
  deliveryStatus: { fontSize: 12, fontWeight: '600', color: '#1A1A2E' },
  triggerBtn: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  triggerDisabled: { opacity: 0.6 },
  triggerText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
