import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchDeepHealth,
  fetchExamWindows,
  fetchIncidents,
  fetchMaintenanceWindows,
  fetchSloSummary,
  scheduleMaintenance,
  type DeepHealth,
  type Incident,
  type SloSummary,
} from '@/src/lib/availability-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function statusColor(status: string) {
  if (status === 'ok') return '#0A7C42';
  if (status === 'degraded') return '#B8860B';
  return '#C0392B';
}

function HealthPanel({ health }: { health: DeepHealth }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Deep health</Text>
      <Text style={styles.meta}>
        Checked {new Date(health.checkedAt).toLocaleString()} · Exam window{' '}
        {health.examWindowActive ? 'active' : 'inactive'}
      </Text>
      {health.sloPct != null ? (
        <Text style={styles.meta}>
          SLO {health.sloPct}% / target {health.sloTargetPct}%
        </Text>
      ) : null}
      {health.components.map((c) => (
        <View key={c.id} style={styles.row}>
          <Text style={styles.rowLabel}>{c.id}</Text>
          <Text style={[styles.badge, { color: statusColor(c.status) }]}>{c.status}</Text>
          <Text style={styles.latency}>{c.latencyMs}ms</Text>
        </View>
      ))}
    </View>
  );
}

function SloPanel({ slo }: { slo: SloSummary }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Exam-window SLO</Text>
      <Text style={styles.meta}>{slo.windowLabel}</Text>
      <Text style={[styles.sloValue, slo.meetsTarget ? styles.sloOk : styles.sloBad]}>
        {slo.measuredSloPct}% measured · target {slo.sloTargetPct}%
      </Text>
      <Text style={styles.meta}>
        {slo.probeCount} probes · {slo.maintenanceExcludedMinutes} min maintenance excluded
      </Text>
    </View>
  );
}

function IncidentsPanel({ incidents }: { incidents: Incident[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Incidents</Text>
      {incidents.length === 0 ? (
        <Text style={styles.meta}>No incidents recorded.</Text>
      ) : (
        incidents.slice(0, 5).map((i) => (
          <View key={i.id} style={styles.incident}>
            <Text style={styles.incidentTitle}>{i.summary}</Text>
            <Text style={styles.meta}>
              {i.componentId} · {new Date(i.occurredAt).toLocaleString()}
            </Text>
            <Text style={styles.correlation}>Correlation: {i.correlationId}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function OperationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('Database patch');
  const [message, setMessage] = useState('PostgreSQL maintenance — expect brief read-only mode.');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const windows = useQuery({ queryKey: ['exam-windows'], queryFn: fetchExamWindows });
  const slo = useQuery({ queryKey: ['availability-slo'], queryFn: fetchSloSummary });
  const maintenance = useQuery({
    queryKey: ['maintenance-windows'],
    queryFn: fetchMaintenanceWindows,
  });
  const incidents = useQuery({ queryKey: ['availability-incidents'], queryFn: fetchIncidents });

  const healthQuery = useQuery({
    queryKey: ['deep-health'],
    queryFn: () => fetchDeepHealth(),
    enabled: false,
  });

  const simulateMutation = useMutation({
    mutationFn: (component: string) => fetchDeepHealth(component),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability-incidents'] });
      void queryClient.invalidateQueries({ queryKey: ['availability-slo'] });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: scheduleMaintenance,
    onSuccess: () => {
      setScheduleError(null);
      void queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] });
      void queryClient.invalidateQueries({ queryKey: ['availability-banner'] });
    },
    onError: (err: Error) => setScheduleError(err.message),
  });

  const onRunHealth = useCallback(() => {
    void healthQuery.refetch();
  }, [healthQuery]);

  const onSimulateFailure = useCallback(() => {
    simulateMutation.mutate('redis');
  }, [simulateMutation]);

  const onScheduleMaintenance = useCallback(() => {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 3);
    const endsAt = new Date(startsAt);
    endsAt.setHours(endsAt.getHours() + 2);

    scheduleMutation.mutate({
      title,
      message,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }, [message, scheduleMutation, title]);

  const health = simulateMutation.data ?? healthQuery.data;
  const busy = healthQuery.isFetching || simulateMutation.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Operations</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.hint}>
            Exam-window monitoring for BCS304 SEE week. Deep health probes API, worker, PostgreSQL,
            Redis, MinIO, and LLM. Maintenance must be announced ≥48h ahead.
          </Text>

          {windows.data?.[0] ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active exam window</Text>
              <Text style={styles.meta}>{windows.data[0].label}</Text>
              <Text style={styles.meta}>
                {windows.data[0].courseCode} · SLO {windows.data[0].sloTargetPct}%
              </Text>
            </View>
          ) : null}

          {slo.data ? <SloPanel slo={slo.data} /> : null}

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={onRunHealth} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Run deep health check</Text>
              )}
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={onSimulateFailure} disabled={busy}>
              <Text style={styles.outlineBtnText}>Simulate Redis failure</Text>
            </Pressable>
          </View>

          {health ? <HealthPanel health={health} /> : null}
          {incidents.data ? <IncidentsPanel incidents={incidents.data} /> : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Schedule maintenance</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Message shown in banner"
              multiline
            />
            <Pressable
              style={styles.primaryBtn}
              onPress={onScheduleMaintenance}
              disabled={scheduleMutation.isPending}
            >
              <Text style={styles.primaryBtnText}>Schedule (+3 days, 2h window)</Text>
            </Pressable>
            {scheduleError ? <Text style={styles.error}>{scheduleError}</Text> : null}
            {scheduleMutation.isSuccess ? (
              <Text style={styles.success}>Maintenance scheduled — banner will appear.</Text>
            ) : null}
          </View>

          {maintenance.data && maintenance.data.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Scheduled maintenance</Text>
              {maintenance.data.map((m) => (
                <Text key={m.id} style={styles.meta}>
                  {m.title}: {new Date(m.startsAt).toLocaleString()} →{' '}
                  {new Date(m.endsAt).toLocaleString()}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECF2',
  },
  back: { fontSize: 16, color: BRAND_PRIMARY, marginRight: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#222' },
  content: { padding: 16, paddingBottom: 32 },
  hint: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECECF2',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 6 },
  meta: { fontSize: 12, color: '#666', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  badge: { fontSize: 12, fontWeight: '700', marginRight: 8 },
  latency: { fontSize: 11, color: '#888' },
  sloValue: { fontSize: 16, fontWeight: '800', marginVertical: 4 },
  sloOk: { color: '#0A7C42' },
  sloBad: { color: '#C0392B' },
  incident: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
  incidentTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  correlation: { fontSize: 10, color: '#888', fontFamily: 'monospace' },
  actions: { gap: 8, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtnText: { color: BRAND_PRIMARY, fontWeight: '600', fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
    backgroundColor: '#FAFAFC',
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: '#C0392B', fontSize: 12, marginTop: 8 },
  success: { color: '#0A7C42', fontSize: 12, marginTop: 8 },
});
