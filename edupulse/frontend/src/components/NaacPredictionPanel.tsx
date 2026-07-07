import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { TrustCardTrigger } from '@/src/components/TrustCardTrigger';
import { fetchNaacPrediction, gapStatusColor } from '@/src/lib/college-radar-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function NaacPredictionPanel() {
  const [trustCardId, setTrustCardId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['college-radar-naac'],
    queryFn: fetchNaacPrediction,
  });

  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (error || !data) {
    return <Text style={styles.error}>Could not load NAAC prediction.</Text>;
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mock peer team · NAAC</Text>

        <View style={styles.gradeHero}>
          <View style={styles.gradeRing}>
            <Text style={styles.gradeLetter}>{data.predictedGrade}</Text>
          </View>
          <Text style={styles.gradeCaption}>
            Predicted grade · CGPA {data.predictedCgpa.toFixed(2)}
          </Text>
          <Text style={styles.subtitle}>{data.subtitle}</Text>
          <Text style={styles.disclaimer}>{data.estimateDisclaimer}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Where marks will be lost</Text>
          {data.criteria.map((row) => (
            <View key={row.criterion} style={styles.critRow}>
              <Text style={styles.critLabel}>{row.criterion}</Text>
              <Text style={[styles.critGap, { color: gapStatusColor(row.status) }]}>
                {row.displayGap}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, styles.fixCard]}>
          <Text style={styles.cardTitle}>{data.fastestFix.title}</Text>
          <Text style={styles.fixBody}>{data.fastestFix.body}</Text>
        </View>

        <View style={styles.trustRow}>
          <TrustCardTrigger onPress={() => setTrustCardId(data.trustCardId)} compact />
        </View>
      </ScrollView>

      <TrustCardSlideOver
        artifactId={trustCardId}
        visible={Boolean(trustCardId)}
        onClose={() => setTrustCardId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  loader: { marginTop: 40 },
  error: { color: '#B3261E', marginTop: 20, paddingHorizontal: 16 },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  gradeHero: { alignItems: 'center', marginVertical: 10 },
  gradeRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 7,
    borderColor: '#EF9F27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeLetter: { fontSize: 28, fontWeight: '900', color: '#1A1A2E' },
  gradeCaption: { fontSize: 13, fontWeight: '700', marginTop: 8, color: '#1A1A2E' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  disclaimer: { fontSize: 10, color: '#AAA', marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  fixCard: { backgroundColor: '#F0FBF6', borderColor: '#B8E6D4' },
  cardTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8, color: '#1A1A2E' },
  critRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  critLabel: { fontSize: 12, color: '#444', flex: 1 },
  critGap: { fontSize: 12, fontWeight: '700' },
  fixBody: { fontSize: 12, color: '#666', lineHeight: 18 },
  trustRow: { marginTop: 4 },
});
