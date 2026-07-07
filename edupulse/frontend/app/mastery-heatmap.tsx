import { AccessDenied } from '@/src/components/AccessDenied';
import { MasteryHeatmapGrid } from '@/src/components/MasteryHeatmapGrid';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { fetchMasteryHeatmap } from '@/src/lib/marks-api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COURSE_CODE = 'BCS304';
const EXAM_TYPE = 'IA-2';

export default function MasteryHeatmapScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.MarksEntry);

  const heatmapQuery = useQuery({
    queryKey: ['mastery-heatmap', COURSE_CODE, EXAM_TYPE],
    queryFn: () => fetchMasteryHeatmap(COURSE_CODE, EXAM_TYPE),
    enabled: allowed,
  });

  if (!allowed) {
    return <AccessDenied message="Mastery heatmap requires faculty access." />;
  }

  const highlighted = heatmapQuery.data?.weakClusters.filter((cluster) => cluster.isHighlighted) ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            Mastery heatmap · {COURSE_CODE}
          </Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {heatmapQuery.data
              ? `${heatmapQuery.data.studentsWithMarks}/${heatmapQuery.data.totalStudents} students with marks · ${heatmapQuery.data.courseOutcomes.length} COs`
              : 'Computing mastery…'}
          </Text>
          {highlighted.length > 0 ? (
            <Text style={styles.metaWarn}>
              {highlighted.length} CO cluster{highlighted.length > 1 ? 's' : ''} flagged below 40%
            </Text>
          ) : null}
        </View>

        <View style={styles.body}>
          {heatmapQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : heatmapQuery.error ? (
            <Text style={styles.error}>Could not compute heatmap. Enter marks first.</Text>
          ) : heatmapQuery.data ? (
            <MasteryHeatmapGrid
              heatmap={heatmapQuery.data}
              onClusterPress={(coTag) =>
                router.push({
                  pathname: '/heatmap-cluster',
                  params: { coTag },
                })
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
  metaWarn: { fontSize: 11, color: '#A32D2D', marginTop: 2, fontWeight: '600' },
  body: { flex: 1, paddingHorizontal: 8, paddingBottom: 12 },
  loader: { marginTop: 32 },
  error: { color: '#E53E3E', padding: 16, fontSize: 13 },
});
