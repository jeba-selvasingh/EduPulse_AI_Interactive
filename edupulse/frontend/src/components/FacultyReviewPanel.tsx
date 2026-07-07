import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { TrustCardTrigger } from '@/src/components/TrustCardTrigger';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  acceptFacultyReview,
  fetchFacultyReviewDetail,
  fetchFlaggedReviews,
  overrideFacultyReview,
  type FacultyReviewDetail,
  type FlaggedReviewItem,
} from '@/src/lib/evaluation-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
  usn?: string;
  questionId?: string;
  onReviewed?: () => void;
};

export function FacultyReviewPanel({ courseCode, examType, usn, questionId, onReviewed }: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<{ usn: string; questionId: string } | null>(
    usn && questionId ? { usn, questionId } : null,
  );
  const [overrideMarks, setOverrideMarks] = useState<number | null>(null);
  const [facultyNote, setFacultyNote] = useState('');
  const [trustCardId, setTrustCardId] = useState<string | null>(null);

  const flaggedQuery = useQuery({
    queryKey: ['flagged-reviews', courseCode, examType],
    queryFn: () => fetchFlaggedReviews(courseCode, examType),
  });

  const detailQuery = useQuery({
    queryKey: ['faculty-review-detail', courseCode, examType, selected?.usn, selected?.questionId],
    queryFn: () =>
      fetchFacultyReviewDetail(courseCode, examType, selected!.usn, selected!.questionId),
    enabled: Boolean(selected),
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      acceptFacultyReview(courseCode, examType, selected!.usn, selected!.questionId),
    onSuccess: () => {
      void invalidateReviewQueries();
      onReviewed?.();
    },
  });

  const overrideMutation = useMutation({
    mutationFn: () =>
      overrideFacultyReview(courseCode, examType, selected!.usn, selected!.questionId, {
        marksAwarded: overrideMarks ?? detailQuery.data!.marksAwarded,
        facultyNote,
      }),
    onSuccess: () => {
      void invalidateReviewQueries();
      setFacultyNote('');
      onReviewed?.();
    },
  });

  const pendingItems = useMemo(
    () => (flaggedQuery.data ?? []).filter((item) => item.reviewStatus === 'pending'),
    [flaggedQuery.data],
  );

  const detail = detailQuery.data;
  const markOptions = useMemo(() => {
    if (!detail) return [];
    const options: number[] = [];
    for (let mark = 0; mark <= detail.maxMarks; mark += 0.5) {
      options.push(mark);
    }
    return options;
  }, [detail]);

  async function invalidateReviewQueries() {
    await queryClient.invalidateQueries({ queryKey: ['flagged-reviews', courseCode, examType] });
    await queryClient.invalidateQueries({
      queryKey: ['faculty-review-detail', courseCode, examType, selected?.usn, selected?.questionId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['evaluation-dashboard', courseCode, examType],
    });
    await queryClient.invalidateQueries({
      queryKey: ['sheet-evaluation', courseCode, examType],
    });
  }

  function openItem(item: FlaggedReviewItem) {
    setSelected({ usn: item.usn, questionId: item.questionId });
    setOverrideMarks(item.marksAwarded);
    setFacultyNote('');
  }

  if (flaggedQuery.isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (!selected) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.sectionTitle}>Flagged for review ({pendingItems.length})</Text>
        {pendingItems.length === 0 ? (
          <Text style={styles.emptyText}>No pending flagged questions. Run AI evaluation first.</Text>
        ) : (
          pendingItems.map((item) => (
            <Pressable
              key={`${item.usn}-${item.questionId}`}
              style={styles.listCard}
              onPress={() => openItem(item)}
              accessibilityRole="button"
            >
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  {item.questionKey} · {item.studentName}
                </Text>
                <Text style={styles.listMarks}>
                  AI {item.aiMarksAwarded}/{item.maxMarks}
                </Text>
              </View>
              <Text style={styles.listMeta}>
                {Math.round(item.confidence * 100)}% confidence · {item.usn}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    );
  }

  if (detailQuery.isLoading || !detail) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  const chosenMarks = overrideMarks ?? detail.marksAwarded;
  const isPending = detail.reviewStatus === 'pending';

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setSelected(null)} accessibilityRole="button">
        <Text style={styles.backLink}>‹ All flagged items</Text>
      </Pressable>

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>
          Review · {detail.questionKey} · {detail.studentName}
        </Text>
        <Text style={styles.headerMeta}>
          AI mark {detail.aiMarksAwarded}/{detail.maxMarks} · {Math.round(detail.confidence * 100)}%
          confidence
        </Text>
        <TrustCardTrigger onPress={() => setTrustCardId(detail.trustCardId)} compact />
      </View>

      <View style={styles.snippetCard}>
        <Text style={styles.snippetTitle}>Scanned answer snippet</Text>
        <Text style={styles.snippetCaption}>{detail.snippetCaption}</Text>
        <Text style={styles.snippetBody}>{detail.scannedSnippet}</Text>
      </View>

      <View style={styles.rationaleCard}>
        <Text style={styles.sectionTitle}>AI rationale</Text>
        <Text style={styles.rationale}>{detail.rationale}</Text>
      </View>

      {isPending ? (
        <>
          <Text style={styles.sectionTitle}>Your mark (override if needed)</Text>
          <View style={styles.markRow}>
            {markOptions.map((mark) => {
              const active = chosenMarks === mark;
              return (
                <Pressable
                  key={mark}
                  style={[styles.markChip, active && styles.markChipActive]}
                  onPress={() => setOverrideMarks(mark)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.markChipText, active && styles.markChipTextActive]}>{mark}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Faculty note (required for override)</Text>
          <TextInput
            style={styles.noteInput}
            value={facultyNote}
            onChangeText={setFacultyNote}
            placeholder="Explain why you changed the AI mark…"
            placeholderTextColor="#999"
            multiline
          />

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.acceptBtn, acceptMutation.isPending && styles.btnDisabled]}
              onPress={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || overrideMutation.isPending}
              accessibilityRole="button"
            >
              <Text style={styles.acceptBtnText}>Accept AI mark</Text>
            </Pressable>
            <Pressable
              style={[styles.overrideBtn, overrideMutation.isPending && styles.btnDisabled]}
              onPress={() => overrideMutation.mutate()}
              disabled={acceptMutation.isPending || overrideMutation.isPending}
              accessibilityRole="button"
            >
              <Text style={styles.overrideBtnText}>Save override</Text>
            </Pressable>
          </View>

          {overrideMutation.isError ? (
            <Text style={styles.errorText}>
              {overrideMutation.error instanceof Error
                ? overrideMutation.error.message
                : 'Override failed'}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={styles.doneCard}>
          <Text style={styles.doneTitle}>
            Review {detail.reviewStatus === 'accepted' ? 'accepted' : 'overridden'}
          </Text>
          <Text style={styles.doneMeta}>
            Final mark {detail.marksAwarded}/{detail.maxMarks}
            {detail.facultyNote ? ` · ${detail.facultyNote}` : ''}
          </Text>
        </View>
      )}

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
  loader: { marginTop: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: { fontSize: 12, color: '#666', lineHeight: 18 },
  listCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5D78E',
    marginBottom: 8,
  },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  listTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  listMarks: { fontSize: 12, fontWeight: '700', color: '#A32D2D' },
  listMeta: { fontSize: 10, color: '#666', marginTop: 4 },
  backLink: { fontSize: 12, fontWeight: '600', color: BRAND_PRIMARY, marginBottom: 4 },
  headerCard: {
    backgroundColor: '#EEEDFE',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  headerTitle: { fontSize: 13, fontWeight: '700', color: '#3C3489' },
  headerMeta: { fontSize: 11, color: '#666' },
  snippetCard: {
    backgroundColor: '#F5F4EF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  snippetTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  snippetCaption: { fontSize: 11, color: '#666', marginBottom: 8 },
  snippetBody: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#5F5E5A',
    lineHeight: 16,
    backgroundColor: '#E8E5F0',
    borderRadius: 8,
    padding: 12,
  },
  rationaleCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rationale: { fontSize: 11, color: '#444', lineHeight: 16 },
  markRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  markChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EDF2F7',
  },
  markChipActive: { backgroundColor: '#EEEDFE', borderWidth: 1, borderColor: BRAND_PRIMARY },
  markChipText: { fontSize: 11, fontWeight: '600', color: '#555' },
  markChipTextActive: { color: BRAND_PRIMARY },
  noteInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    minHeight: 72,
    fontSize: 12,
    color: '#1A1A2E',
    textAlignVertical: 'top',
  },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtnText: { fontSize: 12, fontWeight: '700', color: '#085041' },
  overrideBtn: {
    flex: 1,
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  overrideBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  btnDisabled: { opacity: 0.7 },
  errorText: { fontSize: 12, color: '#A32D2D' },
  doneCard: {
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    padding: 14,
  },
  doneTitle: { fontSize: 13, fontWeight: '700', color: '#085041' },
  doneMeta: { fontSize: 11, color: '#444', marginTop: 4, lineHeight: 16 },
});
