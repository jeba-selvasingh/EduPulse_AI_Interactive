import {
  deltaTextColor,
  fetchProgressTracking,
  trendLabelStyle,
  type ConceptDelta,
  type ReadinessPoint,
} from '@/src/lib/diagnosis-api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  usn?: string;
};

function ReadinessChart({ points }: { points: ReadinessPoint[] }) {
  return (
    <View style={styles.chart}>
      {points.map((point) => (
        <View key={point.label} style={styles.chartColumn}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max(point.barHeightPercent, 12)}%`,
                  backgroundColor: point.color,
                },
              ]}
            />
          </View>
          <Text style={styles.chartLabel}>{point.label}</Text>
          <Text style={styles.chartScore}>{point.sublabel}</Text>
        </View>
      ))}
    </View>
  );
}

function DeltaRow({ label, value, trend }: { label: string; value: string; trend: ConceptDelta['trend'] }) {
  return (
    <View style={styles.deltaRow}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text style={[styles.deltaValue, { color: deltaTextColor(trend) }]}>{value}</Text>
    </View>
  );
}

export function ProgressTrackingPanel({ usn }: Props) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['progress-tracking', usn ?? 'self'],
    queryFn: () => fetchProgressTracking(usn),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading progress trends…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load progress'}
        </Text>
      </View>
    );
  }

  const view = query.data;
  const trendPill = trendLabelStyle(view.readinessTrendLabel);

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Readiness score over time</Text>
        <ReadinessChart points={view.readinessPoints} />
        <Text style={styles.dataPoints}>{view.dataPointCount} assessment snapshots</Text>
      </View>

      <View style={styles.card}>
        {view.conceptDeltas.map((delta) => (
          <DeltaRow
            key={delta.conceptName}
            label={delta.conceptName}
            value={delta.deltaLabel}
            trend={delta.trend}
          />
        ))}
        <DeltaRow
          label="Companies eligible"
          value={view.companiesEligibility.deltaLabel}
          trend={view.companiesEligibility.trend}
        />
      </View>

      <View style={styles.projectionCard}>
        <Text style={styles.projectionText}>
          <Text style={styles.projectionBold}>Projection: </Text>
          {view.projection.summary}
        </Text>
        {view.projection.assumptions.map((assumption) => (
          <Text key={assumption} style={styles.assumption}>
            · {assumption}
          </Text>
        ))}
      </View>

      <Pressable style={styles.cta} onPress={() => router.push('/academic-level')}>
        <Text style={styles.ctaText}>Back to academic level →</Text>
      </Pressable>
    </View>
  );
}

export function ProgressTrendPill({ label }: { label: ReturnType<typeof trendLabelStyle> }) {
  return (
    <View style={[styles.trendPill, { backgroundColor: label.backgroundColor }]}>
      <Text style={[styles.trendPillText, { color: label.color }]}>{label.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: '#888' },
  errorText: { fontSize: 13, color: '#9B1C1C', textAlign: 'center', paddingHorizontal: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 88,
  },
  chartColumn: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: '100%',
    height: 72,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 8,
  },
  chartLabel: { marginTop: 4, fontSize: 9, color: '#888', textAlign: 'center' },
  chartScore: { fontSize: 9, color: '#888', fontWeight: '700', textAlign: 'center' },
  dataPoints: { marginTop: 8, fontSize: 10, color: '#888' },
  deltaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  deltaLabel: { fontSize: 13, color: '#1A1A2E' },
  deltaValue: { fontSize: 13, fontWeight: '700' },
  projectionCard: {
    backgroundColor: '#EEEDFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  projectionText: { fontSize: 12, color: '#4A5568', lineHeight: 18 },
  projectionBold: { fontWeight: '700', color: '#3C3489' },
  assumption: { marginTop: 6, fontSize: 10, color: '#534AB7', lineHeight: 15 },
  cta: {
    backgroundColor: '#534AB7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  trendPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendPillText: { fontSize: 10, fontWeight: '700' },
});
