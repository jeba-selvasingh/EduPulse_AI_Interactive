import {
  fetchInstitutionPulse,
  formatAtRiskDelta,
  formatPlacementDelta,
  type InstitutionPulseView,
} from '@/src/lib/dean-pulse-api';
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

function DeptBar({ dept }: { dept: InstitutionPulseView['readinessByDepartment'][number] }) {
  return (
    <View style={styles.deptBlock}>
      <View style={styles.deptRow}>
        <Text style={styles.deptName}>{dept.department}</Text>
        <Text style={styles.deptScore}>{dept.readinessScore}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${dept.barPercent}%`, backgroundColor: dept.color },
          ]}
        />
      </View>
    </View>
  );
}

export function InstitutionPulsePanel() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['institution-pulse'],
    queryFn: fetchInstitutionPulse,
  });

  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (error || !data) {
    return <Text style={styles.error}>Could not load institution pulse.</Text>;
  }

  const placementDelta = formatPlacementDelta(data.weekOverWeek.placementPctDelta);
  const atRiskDelta = formatAtRiskDelta(data.weekOverWeek.atRiskDelta);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.hdrTitle}>Institution pulse</Text>
        <Pressable style={styles.digestPill} onPress={() => router.push('/monday-digest')}>
          <Text style={styles.digestPillText}>Mon digest</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <View style={styles.scard}>
          <Text style={styles.scardLabel}>Predicted placement</Text>
          <Text style={[styles.scardValue, styles.placementValue]}>
            {data.predictedPlacementPct}% {placementDelta}
          </Text>
        </View>
        <View style={styles.scard}>
          <Text style={styles.scardLabel}>At-risk students</Text>
          <Text style={[styles.scardValue, styles.atRiskValue]}>
            {data.atRiskCount} {atRiskDelta}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Readiness by dept</Text>
        {data.readinessByDepartment.map((dept) => (
          <DeptBar key={dept.department} dept={dept} />
        ))}
      </View>

      <View style={[styles.card, styles.amberCard]}>
        <Text style={styles.cardTitle}>{data.accreditationWatch.title}</Text>
        <Text style={styles.cardBody}>{data.accreditationWatch.summary}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>This week</Text>
        <Text style={styles.cardBody}>
          {data.weekSummary.papersGenerated} papers · {data.weekSummary.hoursSaved} hours saved ·{' '}
          {data.weekSummary.studentsRecovered} students recovered
        </Text>
      </View>

      <Pressable style={styles.cta} onPress={() => router.push('/college-radar')}>
        <Text style={styles.ctaText}>View College Radar →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  loader: { marginTop: 40 },
  error: { color: '#B3261E', marginTop: 20, paddingHorizontal: 16 },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hdrTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  digestPill: {
    backgroundColor: '#EEEDFE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  digestPillText: { fontSize: 11, fontWeight: '600', color: '#534AB7' },
  grid: { flexDirection: 'row', gap: 10 },
  scard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  scardLabel: { fontSize: 10, color: '#888', marginBottom: 4 },
  scardValue: { fontSize: 20, fontWeight: '700' },
  placementValue: { color: '#0F6E56' },
  atRiskValue: { color: '#A32D2D' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  amberCard: { backgroundColor: '#FFFBF0', borderColor: '#F5E0B8' },
  cardTitle: { fontSize: 11, fontWeight: '700', marginBottom: 6, color: '#1A1A2E' },
  cardBody: { fontSize: 12, color: '#666', lineHeight: 18 },
  deptBlock: { marginBottom: 8 },
  deptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  deptName: { fontSize: 12, color: '#444' },
  deptScore: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  track: {
    height: 6,
    backgroundColor: '#EEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  cta: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
