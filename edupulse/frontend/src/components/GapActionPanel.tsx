import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { TrustCardTrigger } from '@/src/components/TrustCardTrigger';
import { actionCardStyle, fetchGapAction } from '@/src/lib/college-radar-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function GapActionPanel() {
  const router = useRouter();
  const [trustCardId, setTrustCardId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['college-radar-gap'],
    queryFn: () => fetchGapAction('rival-a'),
  });

  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (error || !data) {
    return <Text style={styles.error}>Could not load gap action plan.</Text>;
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Close the gap · vs {data.rivalName}</Text>

        {data.actions.map((action) => {
          const cardStyle = actionCardStyle(action.priority);
          return (
            <View
              key={action.id}
              style={[styles.card, { backgroundColor: cardStyle.backgroundColor, borderColor: cardStyle.borderColor }]}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>
                  {action.priority} · {action.title}
                </Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{action.impactEffortLabel}</Text>
                </View>
              </View>
              <Text style={styles.body}>{action.body}</Text>
              <Text style={styles.owner}>Owner: {action.owner}</Text>
            </View>
          );
        })}

        <View style={styles.trustRow}>
          <TrustCardTrigger onPress={() => setTrustCardId(data.trustCardId)} compact />
          <Text style={styles.sources}>sources: {data.sourcesLabel}</Text>
        </View>

        <Pressable style={styles.cta} onPress={() => router.push('/naac-prediction')}>
          <Text style={styles.ctaText}>View predicted NAAC grade →</Text>
        </Pressable>
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
  card: {
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  pill: {
    backgroundColor: '#EEEDFE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: { fontSize: 9, fontWeight: '600', color: '#534AB7' },
  body: { fontSize: 12, color: '#666', lineHeight: 18 },
  owner: { fontSize: 10, color: '#888', marginTop: 6 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sources: { fontSize: 11, color: '#666', flex: 1 },
  cta: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
