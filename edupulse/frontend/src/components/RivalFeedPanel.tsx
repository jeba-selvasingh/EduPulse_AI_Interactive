import { fetchRivalFeed } from '@/src/lib/college-radar-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function RivalFeedPanel() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['college-radar-feed'],
    queryFn: fetchRivalFeed,
  });

  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (error || !data) {
    return <Text style={styles.error}>Could not load rival feed.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.hdrTitle}>Rival watch</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{data.newThisWeek} new this week</Text>
        </View>
      </View>

      {data.items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() => void Linking.openURL(item.sourceUrl)}
        >
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.time}>{item.relativeTime}</Text>
          </View>
          <Text style={styles.summary}>{item.summary}</Text>
        </Pressable>
      ))}

      <Text style={styles.footer}>
        Delivered as Monday digest to principal via WhatsApp
      </Text>

      <Pressable style={styles.cta} onPress={() => router.push('/gap-action')}>
        <Text style={styles.ctaText}>View gap-to-action plan →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  loader: { marginTop: 40 },
  error: { color: '#B3261E', marginTop: 20, paddingHorizontal: 16 },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hdrTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  pill: {
    backgroundColor: '#FCE8E8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 10, fontWeight: '600', color: '#A32D2D' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  time: { fontSize: 10, color: '#888' },
  summary: { fontSize: 12, color: '#666', marginTop: 6, lineHeight: 18 },
  footer: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 4 },
  cta: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
