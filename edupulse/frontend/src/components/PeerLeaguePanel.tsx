import { fetchPeerLeague, type LeagueEntry } from '@/src/lib/college-radar-api';
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

function LeagueRow({ entry }: { entry: LeagueEntry }) {
  const self = entry.isSelf;
  return (
    <View style={[styles.row, self && styles.selfRow]}>
      <Text style={[styles.cellName, self && styles.selfText]} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={[styles.cell, self && styles.selfText]}>
        {entry.nirfRank ?? '—'}
      </Text>
      <Text style={[styles.cell, self && styles.selfText, entry.naacGrade === 'A+' && styles.naacGreen]}>
        {entry.naacGrade}
      </Text>
      <Text style={[styles.cell, self && styles.selfText]}>{entry.placementLabel}</Text>
    </View>
  );
}

export function PeerLeaguePanel({ showNav = true }: { showNav?: boolean }) {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['college-radar-league'],
    queryFn: fetchPeerLeague,
  });

  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (error || !data) {
    return <Text style={styles.error}>Could not load peer league.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.hdrTitle}>📡 College Radar</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{data.rivalsWatched} rivals watched</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.cellName]}>College</Text>
          <Text style={styles.headerCell}>NIRF</Text>
          <Text style={styles.headerCell}>NAAC</Text>
          <Text style={styles.headerCell}>Plcmt</Text>
        </View>
        {data.entries.map((entry) => (
          <LeagueRow key={entry.id} entry={entry} />
        ))}
      </View>

      <View style={styles.amberCard}>
        <Text style={styles.amberText}>
          <Text style={styles.bold}>Position:</Text> {data.positionSummary} · {data.rankDeltaNarrative}
        </Text>
      </View>
      <Text style={styles.footnote}>{data.footnote}</Text>

      {showNav ? (
        <Pressable style={styles.cta} onPress={() => router.push('/nirf-radar')}>
          <Text style={styles.ctaText}>PES vs Rival A · NIRF →</Text>
        </Pressable>
      ) : null}
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
    backgroundColor: '#E1F5EE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 10, fontWeight: '600', color: '#0F6E56' },
  table: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F7FA',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerCell: { flex: 1, fontSize: 10, fontWeight: '700', color: '#888', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
  },
  selfRow: { backgroundColor: '#EEEDFE' },
  cellName: { flex: 2, textAlign: 'left', fontSize: 11 },
  cell: { flex: 1, fontSize: 11, textAlign: 'center', color: '#444' },
  selfText: { color: '#3C3489', fontWeight: '700' },
  naacGreen: { color: '#0F6E56', fontWeight: '700' },
  amberCard: {
    backgroundColor: '#FFFBF0',
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F5E0B8',
  },
  amberText: { fontSize: 12, color: '#666', lineHeight: 18 },
  bold: { fontWeight: '700', color: '#1A1A2E' },
  footnote: { fontSize: 9, color: '#AAA' },
  cta: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
