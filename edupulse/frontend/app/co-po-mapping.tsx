import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchPaperCoPoMapping,
  type CoCoverageEntry,
  type PaperCoPoMapping,
} from '@/src/lib/co-po-mapping-api';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function coveragePillStyle(entry: CoCoverageEntry) {
  if (entry.status === 'adequate') return styles.coverageAdequate;
  if (entry.status === 'low') return styles.coverageLow;
  return styles.coverageMissing;
}

function coverageLabel(entry: CoCoverageEntry) {
  if (entry.status === 'adequate') return `${entry.coTag} ✓`;
  if (entry.status === 'low') return `${entry.coTag} low`;
  return `${entry.coTag} —`;
}

export default function CoPoMappingScreen() {
  const router = useRouter();
  const { paperId, courseCode } = useLocalSearchParams<{
    paperId?: string;
    courseCode?: string;
  }>();
  const allowed = usePermission(Permission.PaperCraftGenerate);

  const mappingQuery = useQuery({
    queryKey: ['paper-co-po-mapping', paperId],
    queryFn: () => fetchPaperCoPoMapping(paperId!),
    enabled: Boolean(paperId) && allowed,
  });

  if (!allowed) {
    return <AccessDenied featureName="CO/PO Mapping" />;
  }

  if (!paperId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>No paper ID provided.</Text>
      </SafeAreaView>
    );
  }

  const mapping = mappingQuery.data;
  const displayCourse = courseCode ?? mapping?.courseCode ?? 'BCS304';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>CO/PO mapping · {displayCourse}</Text>
          <Text style={styles.subtitle}>
            Per-question outcome alignment with strength weights (1–3)
          </Text>

          {mappingQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : mapping ? (
            <>
              <CoveragePanel mapping={mapping} />

              <Text style={styles.sectionLabel}>PER-QUESTION MAPPINGS</Text>

              {mapping.questions.map((entry) => (
                <Pressable
                  key={entry.questionId}
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/co-po-mapping-detail',
                      params: {
                        paperId,
                        questionId: entry.questionId,
                        courseCode: displayCourse,
                      },
                    })
                  }
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.questionKey}>{entry.questionKey}</Text>
                    <View style={styles.strengthPill}>
                      <Text style={styles.strengthPillText}>
                        {entry.coTag} · {entry.poTag} · str {entry.strengthWeight}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rationale}>{entry.rationale}</Text>
                  <Text style={styles.adjustHint}>Tap to adjust mapping ›</Text>
                </Pressable>
              ))}

              {!mapping.readyForSubmit ? (
                <View style={styles.warnCard}>
                  <Text style={styles.warnTitle}>Coverage gaps before submit</Text>
                  <Text style={styles.warnBody}>
                    {mapping.underRepresentedCount} course outcome
                    {mapping.underRepresentedCount === 1 ? '' : 's'} need stronger representation.
                    Adjust mappings or regenerate questions for missing COs.
                  </Text>
                </View>
              ) : (
                <View style={styles.okCard}>
                  <Text style={styles.okText}>All CO1–CO5 adequately covered for moderation</Text>
                  <Pressable
                    style={styles.submitLink}
                    onPress={() =>
                      router.push({
                        pathname: '/paper-moderation',
                        params: { paperId, courseCode: displayCourse },
                      })
                    }
                  >
                    <Text style={styles.submitLinkText}>Submit for moderation →</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.error}>Could not load CO/PO mapping.</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function CoveragePanel({ mapping }: { mapping: PaperCoPoMapping }) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coverage this paper</Text>
        <View style={styles.coveragePillRow}>
          {mapping.coverage.map((entry) => (
            <View key={entry.coTag} style={[styles.coveragePill, coveragePillStyle(entry)]}>
              <Text style={styles.coveragePillText}>{coverageLabel(entry)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall attainment target</Text>
        {mapping.coverage.map((entry) => (
          <View key={entry.coTag} style={styles.coverageRow}>
            <Text style={styles.coLabel}>{entry.coTag}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  entry.status === 'adequate' && styles.barAdequate,
                  entry.status === 'low' && styles.barLow,
                  entry.status === 'missing' && styles.barMissing,
                  { width: `${entry.coveragePct}%` },
                ]}
              />
            </View>
            <Text style={styles.coveragePct}>{entry.coveragePct}%</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  back: { padding: 16 },
  backText: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  body: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  loader: { marginVertical: 24 },
  error: { fontSize: 13, color: '#A32D2D', padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECF2',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  questionKey: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  strengthPill: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 1,
  },
  strengthPillText: { fontSize: 10, fontWeight: '700', color: '#085041' },
  rationale: { fontSize: 12, color: '#555', lineHeight: 18 },
  adjustHint: { fontSize: 10, color: BRAND_PRIMARY, marginTop: 8, fontWeight: '600' },
  coveragePillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  coveragePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coverageAdequate: { backgroundColor: '#E1F5EE' },
  coverageLow: { backgroundColor: '#FFF3D6' },
  coverageMissing: { backgroundColor: '#FCEBEB' },
  coveragePillText: { fontSize: 10, fontWeight: '700', color: '#1A1A2E' },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  coLabel: { width: 28, fontSize: 11, fontWeight: '600', color: '#444' },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#ECECF2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barAdequate: { backgroundColor: '#5DCAA5' },
  barLow: { backgroundColor: '#FAC775' },
  barMissing: { backgroundColor: '#E88B8B' },
  coveragePct: { width: 36, fontSize: 10, fontWeight: '600', color: '#666', textAlign: 'right' },
  warnCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5D78E',
    marginTop: 4,
  },
  warnTitle: { fontSize: 12, fontWeight: '700', color: '#8A5A00', marginBottom: 4 },
  warnBody: { fontSize: 11, color: '#6B4E12', lineHeight: 16 },
  okCard: {
    backgroundColor: '#E8F8F1',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B8E6D4',
    marginTop: 4,
  },
  okText: { fontSize: 12, fontWeight: '600', color: '#085041' },
  submitLink: { marginTop: 10 },
  submitLinkText: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
});
