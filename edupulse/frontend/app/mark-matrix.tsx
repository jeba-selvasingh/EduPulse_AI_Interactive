import { AccessDenied } from '@/src/components/AccessDenied';
import { MarksCsvExportPanel } from '@/src/components/MarksCsvExportPanel';
import { MarksEntryGrid } from '@/src/components/MarksEntryGrid';
import { MarksExcelImportPanel } from '@/src/components/MarksExcelImportPanel';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { fetchMarksGrid, type MarksGrid } from '@/src/lib/marks-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COURSE_CODE = 'BCS304';
const EXAM_TYPE = 'IA-2';

export default function MarkMatrixScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const allowed = usePermission(Permission.MarksEntry);
  const [showImport, setShowImport] = useState(false);

  const gridQuery = useQuery({
    queryKey: ['marks-grid', COURSE_CODE, EXAM_TYPE],
    queryFn: () => fetchMarksGrid(COURSE_CODE, EXAM_TYPE),
    enabled: allowed,
  });

  const onImported = useCallback(
    (grid: MarksGrid) => {
      queryClient.setQueryData(['marks-grid', COURSE_CODE, EXAM_TYPE], grid);
      void queryClient.invalidateQueries({ queryKey: ['mastery-heatmap', COURSE_CODE, EXAM_TYPE] });
    },
    [queryClient],
  );

  if (!allowed) {
    return <AccessDenied message="Marks entry requires faculty access." />;
  }

  const completion = gridQuery.data?.completion;
  const badge =
    completion != null
      ? `${completion.savedCells}/${completion.totalCells} saved`
      : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {EXAM_TYPE} marks · {COURSE_CODE}
          </Text>
          <Text style={styles.badge} accessibilityLabel={`Completion ${badge}`}>
            {badge}
          </Text>
        </View>

        <View style={styles.toolbar}>
          {!gridQuery.data?.isPublished ? (
            <Pressable
              style={[styles.importPill, showImport && styles.importPillActive]}
              onPress={() => setShowImport((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel="Excel import"
            >
              <Text style={[styles.importPillText, showImport && styles.importPillTextActive]}>
                Excel import
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.publishedBadge}>Published · AI evaluation</Text>
          )}
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {gridQuery.data
              ? `${gridQuery.data.questions.length} questions · ${gridQuery.data.completion.totalStudents} students`
              : 'Loading assessment…'}
          </Text>
          {completion ? (
            <Text style={styles.metaSub}>
              {gridQuery.data?.isPublished
                ? 'Published from AI evaluation · grid is read-only'
                : `${completion.completedStudents} students fully entered · partial save enabled`}
            </Text>
          ) : null}
        </View>

        <View style={styles.body}>
          {gridQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : gridQuery.error ? (
            <Text style={styles.error}>Could not load marks grid. Import cohort data first.</Text>
          ) : gridQuery.data ? (
            <MarksEntryGrid grid={gridQuery.data} courseCode={COURSE_CODE} examType={EXAM_TYPE} />
          ) : null}
        </View>

        <Pressable
          style={styles.computeBtn}
          onPress={() => router.push('/mastery-heatmap')}
          accessibilityRole="button"
          accessibilityLabel="Save and compute mastery heatmap"
        >
          <Text style={styles.computeBtnText}>View mastery heatmap →</Text>
        </Pressable>

        {gridQuery.data ? (
          <View style={styles.exportWrap}>
            <MarksCsvExportPanel
              courseCode={COURSE_CODE}
              examType={EXAM_TYPE}
              isPublished={gridQuery.data.isPublished}
            />
          </View>
        ) : null}

        {showImport ? (
          <MarksExcelImportPanel
            courseCode={COURSE_CODE}
            examType={EXAM_TYPE}
            onImported={(summary) => onImported(summary.grid)}
            onClose={() => setShowImport(false)}
          />
        ) : null}
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
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0C447C',
    backgroundColor: '#E6F1FB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toolbar: { paddingHorizontal: 16, paddingTop: 10 },
  importPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  importPillActive: { borderColor: BRAND_PRIMARY, backgroundColor: '#E6F1FB' },
  importPillText: { fontSize: 11, fontWeight: '600', color: '#4A5568' },
  importPillTextActive: { color: BRAND_PRIMARY },
  publishedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F6E56',
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  meta: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  metaText: { fontSize: 12, color: '#4A5568', fontWeight: '600' },
  metaSub: { fontSize: 11, color: '#718096', marginTop: 2 },
  body: { flex: 1, paddingHorizontal: 8, paddingBottom: 8 },
  computeBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  computeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  exportWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  loader: { marginTop: 32 },
  error: { color: '#E53E3E', padding: 16, fontSize: 13 },
});
