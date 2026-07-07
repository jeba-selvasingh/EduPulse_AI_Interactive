import {
  competencyPillStyle,
  fetchAcademicLevel,
  trendArrow,
  type AcademicSubject,
} from '@/src/lib/diagnosis-api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  previewUsn?: string;
};

function SubjectCard({ subject, onPress }: { subject: AcademicSubject; onPress: () => void }) {
  const pill = competencyPillStyle(subject.competency);
  const cardStyle = subject.trendWarning ? styles.cardWarning : styles.card;

  return (
    <Pressable style={cardStyle} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.courseName}>{subject.courseName}</Text>
        <View style={[styles.pill, { backgroundColor: pill.backgroundColor }]}>
          <Text style={[styles.pillText, { color: pill.color }]}>
            {subject.competency} {trendArrow(subject.trend)}
          </Text>
        </View>
      </View>
      <Text style={[styles.summary, subject.trendWarning && styles.summaryWarning]}>
        {subject.summary} ›
      </Text>
      {subject.trendWarning ? (
        <View style={styles.warningBadge}>
          <Text style={styles.warningBadgeText}>Declining trend</Text>
        </View>
      ) : null}
      <Text style={styles.bloomMeta}>Bloom L{subject.highestBloomLevel} · NEP ladder</Text>
    </Pressable>
  );
}

export function AcademicLevelPanel({ previewUsn }: Props) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['academic-level', previewUsn ?? 'self'],
    queryFn: () => fetchAcademicLevel(previewUsn),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading academic level…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load academic level'}
        </Text>
      </View>
    );
  }

  const view = query.data;

  return (
    <View>
      {view.subjects.map((subject) => (
        <SubjectCard
          key={subject.courseCode}
          subject={subject}
          onPress={() => router.push(subject.diagnosisRoute as '/student-diagnosis')}
        />
      ))}
      <Text style={styles.caption}>{view.ladderCaption}</Text>
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
  cardWarning: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEB2B2',
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  courseName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  summary: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  summaryWarning: {
    color: '#C53030',
    fontWeight: '600',
  },
  warningBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FED7D7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9B1C1C',
  },
  bloomMeta: {
    marginTop: 6,
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  caption: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
});
