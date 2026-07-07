import {
  fetchExamEvidence,
  questionScoreColor,
  type ExamQuestionEvidence,
} from '@/src/lib/diagnosis-api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
  usn?: string;
};

function QuestionCard({ question }: { question: ExamQuestionEvidence }) {
  const router = useRouter();
  const scoreColor = questionScoreColor(
    question.marksAwarded,
    question.maxMarks,
    question.isWeak,
  );

  return (
    <View style={[styles.card, question.isWeak && styles.cardWeak]}>
      <View style={styles.row}>
        <Text style={styles.questionLabel}>{question.label}</Text>
        <Text style={[styles.score, { color: scoreColor }]}>
          {question.marksAwarded}/{question.maxMarks}
        </Text>
      </View>
      <Text style={styles.feedback}>{question.rubricFeedback}</Text>
      <Text style={styles.classAvg}>Class avg {question.classAverageMarks}/{question.maxMarks}</Text>
      {question.isWeak && question.improvementRoute ? (
        <Pressable onPress={() => router.push(question.improvementRoute as '/improvement-areas')}>
          <Text style={styles.improveLink}>View improvement area →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ExamEvidencePanel({ courseCode, examType, usn }: Props) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['exam-evidence', courseCode, examType, usn ?? 'self'],
    queryFn: () => fetchExamEvidence(courseCode, examType, usn),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading exam evidence…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load exam evidence'}
        </Text>
      </View>
    );
  }

  const view = query.data;

  return (
    <View>
      {view.questions.map((question) => (
        <QuestionCard key={question.questionId} question={question} />
      ))}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>What this exam says</Text>
        <Text style={styles.summaryText}>{view.summary.insight}</Text>
      </View>

      <Pressable
        style={styles.cta}
        onPress={() => router.push(view.improvementPlanRoute as '/improvement-areas')}
      >
        <Text style={styles.ctaText}>Generate improvement plan →</Text>
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
  cardWeak: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F09595',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  questionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  score: {
    fontSize: 13,
    fontWeight: '700',
  },
  feedback: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  classAvg: {
    marginTop: 6,
    fontSize: 10,
    color: '#888',
  },
  improveLink: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#534AB7',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
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
