import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { fetchHeatmapClusterDrilldown } from '@/src/lib/marks-api';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COURSE_CODE = 'BCS304';
const EXAM_TYPE = 'IA-2';

const BAND_COLOR: Record<string, string> = {
  green: '#0F6E56',
  amber: '#854F0B',
  red: '#A32D2D',
};

export default function HeatmapClusterScreen() {
  const router = useRouter();
  const { coTag } = useLocalSearchParams<{ coTag?: string }>();
  const allowed = usePermission(Permission.MarksEntry);

  const drilldownQuery = useQuery({
    queryKey: ['heatmap-cluster', COURSE_CODE, EXAM_TYPE, coTag],
    queryFn: () => fetchHeatmapClusterDrilldown(COURSE_CODE, EXAM_TYPE, coTag!),
    enabled: allowed && Boolean(coTag),
  });

  if (!allowed) {
    return <AccessDenied message="Heatmap drill-down requires faculty access." />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {coTag ?? 'CO'} weak cluster
          </Text>
        </View>

        <View style={styles.meta}>
          {drilldownQuery.data ? (
            <>
              <Text style={styles.metaText}>{drilldownQuery.data.title}</Text>
              <Text style={styles.metaSub}>
                {drilldownQuery.data.students.length} students below 40% mastery
              </Text>
            </>
          ) : (
            <Text style={styles.metaText}>Loading cluster…</Text>
          )}
        </View>

        <View style={styles.body}>
          {drilldownQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : drilldownQuery.error ? (
            <Text style={styles.error}>Could not load cluster students.</Text>
          ) : drilldownQuery.data ? (
            <FlatList
              data={drilldownQuery.data.students}
              keyExtractor={(item) => item.usn}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.studentCard}
                  onPress={() => router.push(item.diagnosisRoute as `/student-diagnosis?${string}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open diagnosis for ${item.studentName}`}
                >
                  <View style={styles.studentRow}>
                    <View style={styles.studentMeta}>
                      <Text style={styles.studentName}>{item.studentName}</Text>
                      <Text style={styles.studentUsn}>{item.usn}</Text>
                    </View>
                    <Text style={[styles.score, { color: BAND_COLOR[item.band] ?? '#1A1A2E' }]}>
                      {item.masteryPercent}%
                    </Text>
                  </View>
                  <Text style={styles.diagnosisLink}>View concept diagnosis →</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No weak students in this cluster yet.</Text>
              }
            />
          ) : null}
        </View>
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
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    gap: 8,
  },
  back: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  meta: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  metaText: { fontSize: 12, color: '#4A5568', fontWeight: '600' },
  metaSub: { fontSize: 11, color: '#A32D2D', marginTop: 2 },
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  loader: { marginTop: 32 },
  error: { color: '#E53E2E', padding: 16, fontSize: 13 },
  studentCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  studentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  studentMeta: { flex: 1 },
  studentName: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  studentUsn: { fontSize: 10, color: '#718096', marginTop: 2 },
  score: { fontSize: 16, fontWeight: '700' },
  diagnosisLink: { fontSize: 11, color: BRAND_PRIMARY, fontWeight: '600' },
  empty: { fontSize: 12, color: '#718096', textAlign: 'center', marginTop: 24 },
});
