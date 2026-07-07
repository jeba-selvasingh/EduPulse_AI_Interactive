import { fetchNirfRadar } from '@/src/lib/college-radar-api';
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

export function NirfRadarPanel() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['college-radar-nirf'],
    queryFn: () => fetchNirfRadar('rival-a'),
  });

  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (error || !data) {
    return <Text style={styles.error}>Could not load NIRF comparison.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {data.institutionName} vs {data.rivalName} · NIRF {data.dataYear}
      </Text>

      <View style={styles.chartWrap}>
        {data.parameters.map((param) => (
          <View key={param.key} style={styles.barBlock}>
            <Text style={styles.barKey}>{param.key}</Text>
            <View style={styles.barPair}>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, styles.pesBar, { width: `${(param.pesScore / 70) * 100}%` }]}
                />
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    styles.rivalBar,
                    { width: `${(param.rivalScore / 70) * 100}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
        <View style={styles.legend}>
          <Text style={styles.legendPes}>● PES</Text>
          <Text style={styles.legendRival}>● {data.rivalName}</Text>
        </View>
      </View>

      {data.parameters.map((param) => (
        <View key={param.key} style={styles.paramCard}>
          <View style={styles.paramRow}>
            <Text style={styles.paramKey}>{param.key}</Text>
            <Text style={[styles.paramScore, param.pesAhead && styles.ahead]}>
              {param.comparisonLabel}
            </Text>
          </View>
          <Text style={styles.paramDef}>{param.definition}</Text>
        </View>
      ))}

      <Pressable style={styles.cta} onPress={() => router.push('/cutoff-tracker')}>
        <Text style={styles.ctaText}>KCET cutoff tracker →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  loader: { marginTop: 40 },
  error: { color: '#B3261E', marginTop: 20, paddingHorizontal: 16 },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  chartWrap: { marginVertical: 8, gap: 8 },
  barBlock: { gap: 4 },
  barKey: { fontSize: 11, fontWeight: '700', color: '#5f5e5a' },
  barPair: { gap: 4 },
  barTrack: {
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  pesBar: { backgroundColor: '#534AB7' },
  rivalBar: { backgroundColor: '#D85A30' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' },
  legendPes: { fontSize: 11, color: '#534AB7', fontWeight: '600' },
  legendRival: { fontSize: 11, color: '#D85A30', fontWeight: '600' },
  paramCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  paramRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  paramKey: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  paramScore: { fontSize: 12, color: '#666' },
  ahead: { color: '#0F6E56', fontWeight: '700' },
  paramDef: { fontSize: 11, color: '#888', lineHeight: 16 },
  cta: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
