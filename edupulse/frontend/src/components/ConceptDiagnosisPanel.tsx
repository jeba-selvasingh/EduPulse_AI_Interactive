import {
  bloomStripColor,
  fetchConceptDiagnosisMap,
  masteryBarColor,
  masteryTextColor,
  type ConceptMastery,
} from '@/src/lib/diagnosis-api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

type Props = {
  courseCode: string;
  usn?: string;
  coTag?: string;
  examType?: string;
};

function ConceptRow({ concept }: { concept: ConceptMastery }) {
  const percent = concept.masteryPercent ?? 0;
  const fillWidth: DimensionValue =
    concept.masteryPercent === null ? '0%' : (`${percent}%` as `${number}%`);

  return (
    <View style={[styles.conceptRow, concept.isWeak && styles.conceptRowWeak]}>
      <View style={styles.conceptHeader}>
        <Text style={styles.conceptName}>{concept.name}</Text>
        <Text style={[styles.conceptScore, { color: masteryTextColor(concept.band) }]}>
          {concept.masteryPercent === null ? '—' : percent}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
            width: fillWidth,
              backgroundColor: masteryBarColor(concept.band),
            },
          ]}
        />
      </View>
      {concept.isWeak ? <Text style={styles.weakLabel}>Below 40% · needs focus</Text> : null}
    </View>
  );
}

export function ConceptDiagnosisPanel({ courseCode, usn, coTag, examType }: Props) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['concept-diagnosis', courseCode, usn ?? 'self', coTag ?? 'all', examType ?? 'IA-2'],
    queryFn: () => fetchConceptDiagnosisMap(courseCode, { usn, coTag, examType }),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading concept map…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load concept map'}
        </Text>
      </View>
    );
  }

  const map = query.data;

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mastery by concept</Text>
        {map.concepts.map((concept) => (
          <ConceptRow key={concept.conceptId} concept={concept} />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bloom capability in {map.courseName}</Text>
        <View style={styles.bloomStrip}>
          {map.bloomStrip.levels.map((level) => (
            <View
              key={level.level}
              style={[styles.bloomSegment, { backgroundColor: bloomStripColor(level.status) }]}
            />
          ))}
        </View>
        <Text style={styles.bloomCaption}>{map.bloomStrip.caption}</Text>
      </View>

      <View style={styles.aiCard}>
        <Text style={styles.aiText}>
          <Text style={styles.aiLabel}>AI diagnosis: </Text>
          {map.aiDiagnosis.summary}
        </Text>
        {map.aiDiagnosis.evidenceRefs.map((ref) => (
          <Text key={ref} style={styles.evidenceRef}>
            · {ref}
          </Text>
        ))}
        {map.aiDiagnosis.trustCardId ? (
          <Pressable
            onPress={() => {
              // Trust card slide-over lands in a shared component later; route stub for pilot.
            }}
          >
            <Text style={styles.trustLink}>✓ Trust card ›</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={styles.cta}
        onPress={() => router.push(map.examEvidenceRoute as '/exam-evidence')}
      >
        <Text style={styles.ctaText}>View exam evidence →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#888',
  },
  errorText: {
    fontSize: 13,
    color: '#9B1C1C',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  conceptRow: {
    marginBottom: 12,
  },
  conceptRowWeak: {
    backgroundColor: '#FFF5F5',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  conceptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conceptName: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  conceptScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: '#EDF2F7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  weakLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#9B1C1C',
  },
  bloomStrip: {
    flexDirection: 'row',
    gap: 4,
    height: 10,
    marginBottom: 6,
  },
  bloomSegment: {
    flex: 1,
    borderRadius: 2,
  },
  bloomCaption: {
    fontSize: 10,
    color: '#888',
  },
  aiCard: {
    backgroundColor: '#EEEDFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  aiText: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  aiLabel: {
    fontWeight: '700',
    color: '#3C3489',
  },
  evidenceRef: {
    fontSize: 11,
    color: '#534AB7',
    marginTop: 4,
    lineHeight: 16,
  },
  trustLink: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#085041',
  },
  cta: {
    backgroundColor: '#534AB7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
