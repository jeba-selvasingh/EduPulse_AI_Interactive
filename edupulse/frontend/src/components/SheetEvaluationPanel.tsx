import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { TrustCardTrigger } from '@/src/components/TrustCardTrigger';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { fetchCourseRoster } from '@/src/lib/cohort-api';
import {
  fetchSheetEvaluation,
  runSheetEvaluation,
  type SheetEvaluation,
} from '@/src/lib/evaluation-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
  paperId?: string;
  initialUsn?: string;
  onEvaluated?: (evaluation: SheetEvaluation) => void;
};

export function SheetEvaluationPanel({
  courseCode,
  examType,
  paperId,
  initialUsn,
  onEvaluated,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedUsn, setSelectedUsn] = useState<string | null>(initialUsn ?? null);
  const [trustCardId, setTrustCardId] = useState<string | null>(null);

  const rosterQuery = useQuery({
    queryKey: ['course-roster', courseCode, 'evaluation'],
    queryFn: () => fetchCourseRoster(courseCode),
  });

  const existingQuery = useQuery({
    queryKey: ['sheet-evaluation', courseCode, examType, selectedUsn],
    queryFn: () => fetchSheetEvaluation(courseCode, examType, selectedUsn!),
    enabled: Boolean(selectedUsn),
    retry: (_, error) => error instanceof Error && error.message !== 'NOT_FOUND',
  });

  const evaluateMutation = useMutation({
    mutationFn: (usn: string) => runSheetEvaluation(courseCode, examType, usn, paperId),
    onSuccess: (evaluation) => {
      void queryClient.invalidateQueries({
        queryKey: ['sheet-evaluation', courseCode, examType, evaluation.usn],
      });
      void queryClient.invalidateQueries({
        queryKey: ['evaluation-dashboard', courseCode, examType, paperId],
      });
      onEvaluated?.(evaluation);
    },
  });

  const evaluation = evaluateMutation.data ?? existingQuery.data;
  const roster = rosterQuery.data;

  const flaggedCount = useMemo(
    () => evaluation?.questions.filter((question) => question.flaggedForReview).length ?? 0,
    [evaluation],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Select student (USN)</Text>
      {rosterQuery.isLoading ? (
        <ActivityIndicator color={BRAND_PRIMARY} />
      ) : (
        <FlatList
          data={roster?.students ?? []}
          keyExtractor={(item) => item.usn}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.usnList}
          renderItem={({ item }) => {
            const active = selectedUsn === item.usn;
            return (
              <Pressable
                style={[styles.usnChip, active && styles.usnChipActive]}
                onPress={() => setSelectedUsn(item.usn)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.usnChipText, active && styles.usnChipTextActive]}>{item.usn}</Text>
              </Pressable>
            );
          }}
        />
      )}

      {selectedUsn ? (
        <Pressable
          style={[styles.runBtn, evaluateMutation.isPending && styles.runBtnDisabled]}
          onPress={() => evaluateMutation.mutate(selectedUsn)}
          disabled={evaluateMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Run AI rubric evaluation"
        >
          {evaluateMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.runBtnText}>Run AI rubric evaluation</Text>
          )}
        </Pressable>
      ) : null}

      {evaluateMutation.isError ? (
        <Text style={styles.errorText}>
          {evaluateMutation.error instanceof Error
            ? evaluateMutation.error.message
            : 'Evaluation failed'}
        </Text>
      ) : null}

      {evaluation ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultCopy}>
              <Text style={styles.studentName}>{evaluation.studentName}</Text>
              <Text style={styles.usnMeta}>{evaluation.usn}</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>
                {evaluation.totalMarks}/{evaluation.maxTotalMarks}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{evaluation.modelName}</Text>
            <Text style={styles.metaText}>{(evaluation.durationMs / 1000).toFixed(1)}s</Text>
            {flaggedCount > 0 ? (
              <Text style={styles.flagPill}>{flaggedCount} flagged</Text>
            ) : (
              <Text style={styles.clearPill}>All confident</Text>
            )}
          </View>

          <TrustCardTrigger onPress={() => setTrustCardId(evaluation.trustCardId)} compact />

          <Text style={styles.sectionTitle}>Per-question results</Text>
          {evaluation.questions.map((question) => (
            <View
              key={question.questionId}
              style={[styles.questionCard, question.flaggedForReview && styles.questionFlagged]}
            >
              <View style={styles.questionHeader}>
                <Text style={styles.questionKey}>{question.questionKey}</Text>
                <Text style={styles.questionMarks}>
                  {question.marksAwarded}/{question.maxMarks}
                </Text>
              </View>
              <Text style={styles.rationale}>{question.rationale}</Text>
              <View style={styles.questionFooter}>
                <Text style={styles.confidence}>
                  {Math.round(question.confidence * 100)}% confidence
                </Text>
                {question.flaggedForReview ? (
                  <Text style={styles.reviewBadge}>Needs review</Text>
                ) : null}
                <TrustCardTrigger
                  onPress={() => setTrustCardId(question.trustCardId)}
                  compact
                />
              </View>
            </View>
          ))}
        </View>
      ) : selectedUsn && existingQuery.isLoading ? (
        <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
      ) : null}

      <TrustCardSlideOver
        artifactId={trustCardId}
        visible={Boolean(trustCardId)}
        onClose={() => setTrustCardId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginTop: 8,
    marginBottom: 4,
  },
  usnList: { marginBottom: 4, maxHeight: 40 },
  usnChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EDF2F7',
    marginRight: 6,
  },
  usnChipActive: { backgroundColor: '#EEEDFE', borderWidth: 1, borderColor: BRAND_PRIMARY },
  usnChipText: { fontSize: 10, color: '#555', fontWeight: '600' },
  usnChipTextActive: { color: BRAND_PRIMARY },
  runBtn: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  runBtnDisabled: { opacity: 0.7 },
  runBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  errorText: { fontSize: 12, color: '#A32D2D', marginTop: 8 },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    gap: 8,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultCopy: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  usnMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  scorePill: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoreText: { fontSize: 13, fontWeight: '700', color: '#085041' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  metaText: { fontSize: 10, color: '#666' },
  flagPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A5A00',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  clearPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#085041',
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  questionCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    gap: 6,
  },
  questionFlagged: { borderColor: '#F5D78E', backgroundColor: '#FFFBEB' },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionKey: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  questionMarks: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
  rationale: { fontSize: 11, color: '#444', lineHeight: 16 },
  questionFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  confidence: { fontSize: 10, color: '#666' },
  reviewBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A5A00',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  loader: { marginTop: 16 },
});
