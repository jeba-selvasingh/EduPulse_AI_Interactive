import { fetchCutoffTracker } from '@/src/lib/college-radar-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BAR_COLORS = ['#AFA9EC', '#7F77DD', '#534AB7'];

export function CutoffTrackerPanel() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['college-radar-cutoff'],
    queryFn: fetchCutoffTracker,
  });

  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (error || !data) {
    return <Text style={styles.error}>Could not load cutoff tracker.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{data.examLabel}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Closing rank trend (lower = better)</Text>
        <View style={styles.chart}>
          {data.pesTrend.map((point, idx) => (
            <View key={point.year} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(24, point.barPercent * 0.7),
                    backgroundColor: BAR_COLORS[idx] ?? BAR_COLORS[2],
                  },
                ]}
              />
              <Text style={styles.barLabel}>
                {point.year}
                {'\n'}
                {point.label}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.trendWarn}>↓ {data.trendNarrative}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rival comparison · {data.branch}</Text>
        {data.comparisons.map((row) => (
          <View key={row.label} style={styles.compRow}>
            <Text style={styles.compLabel}>{row.label}</Text>
            <Text style={styles.compRank}>
              {row.direction === 'up' ? '↑' : row.direction === 'down' ? '↓' : '—'}{' '}
              {row.displayRank}
            </Text>
          </View>
        ))}
        <Text style={styles.signal}>{data.signalNarrative}</Text>
      </View>

      <Pressable style={styles.cta} onPress={() => router.push('/rival-feed')}>
        <Text style={styles.ctaText}>Rival watch feed →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  loader: { marginTop: 40 },
  error: { color: '#B3261E', marginTop: 20, paddingHorizontal: 16 },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8, color: '#1A1A2E' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 90 },
  barCol: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabel: { fontSize: 9, color: '#888', marginTop: 4, textAlign: 'center', lineHeight: 12 },
  trendWarn: { fontSize: 12, color: '#A32D2D', marginTop: 8 },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  compLabel: { fontSize: 12, color: '#444' },
  compRank: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  signal: { fontSize: 12, color: '#666', marginTop: 8, lineHeight: 18 },
  cta: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
