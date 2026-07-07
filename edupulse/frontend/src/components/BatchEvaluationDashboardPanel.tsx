import { BRAND_PRIMARY } from '@/src/constants/theme';
import { PublishMarksPanel } from '@/src/components/PublishMarksPanel';
import {
  fetchBatchInsights,
  refreshBatchHeatmap,
  type BatchEvaluationInsights,
  type QuestionAverage,
} from '@/src/lib/evaluation-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
};

const BAND_COLORS: Record<string, string> = {
  O_A_PLUS: '#5DCAA5',
  A_B_PLUS: '#378ADD',
  B: '#FAC775',
  BELOW_50: '#F09595',
};

function DistributionRow({
  label,
  count,
  percent,
  color,
}: {
  label: string;
  count: number;
  percent: number;
  color: string;
}) {
  return (
    <View style={styles.distRow}>
      <View style={styles.distHeader}>
        <Text style={styles.distLabel}>{label}</Text>
        <Text style={styles.distCount}>{count} students</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function QuestionRow({ question, weakestId }: { question: QuestionAverage; weakestId: string | null }) {
  const isWeakest = question.questionId === weakestId;
  const shortTopic = question.topic.length > 28 ? `${question.topic.slice(0, 28)}…` : question.topic;

  return (
    <View style={styles.qRow}>
      <Text style={styles.qLabel} numberOfLines={1}>
        {question.questionKey} · {shortTopic}
      </Text>
      <Text style={[styles.qAvg, isWeakest && styles.qAvgWeak]}>
        Avg {question.averageMarks}/{question.maxMarks}
        {isWeakest ? ' ↓' : ''}
      </Text>
    </View>
  );
}

export function BatchEvaluationDashboardPanel({ courseCode, examType }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const insightsQuery = useQuery({
    queryKey: ['batch-insights', courseCode, examType],
    queryFn: () => fetchBatchInsights(courseCode, examType),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshBatchHeatmap(courseCode, examType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mastery-heatmap', courseCode, examType] });
      void queryClient.invalidateQueries({ queryKey: ['batch-insights', courseCode, examType] });
    },
  });

  if (insightsQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={BRAND_PRIMARY} />
        <Text style={styles.loadingText}>Loading batch insights…</Text>
      </View>
    );
  }

  if (insightsQuery.isError || !insightsQuery.data) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Could not load batch insights</Text>
        <Pressable onPress={() => void insightsQuery.refetch()} accessibilityRole="button">
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const insights: BatchEvaluationInsights = insightsQuery.data;
  const weakestId = insights.weakestQuestion?.questionId ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.statusGrid}>
        <View style={styles.statusCard}>
          <Text style={[styles.statusValue, { color: '#0F6E56' }]}>{insights.approvedCount}</Text>
          <Text style={styles.statusLabel}>Approved</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={[styles.statusValue, { color: '#BA7517' }]}>{insights.inReviewCount}</Text>
          <Text style={styles.statusLabel}>In review</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={[styles.statusValue, { color: '#A32D2D' }]}>{insights.pendingCount}</Text>
          <Text style={styles.statusLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Score distribution</Text>
        {insights.scoreDistribution.map((bucket) => (
          <DistributionRow
            key={bucket.band}
            label={bucket.label}
            count={bucket.count}
            percent={bucket.percent}
            color={BAND_COLORS[bucket.band] ?? BRAND_PRIMARY}
          />
        ))}
        {insights.evaluatedCount === 0 ? (
          <Text style={styles.emptyHint}>No evaluated sheets yet.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Question-wise class performance</Text>
        {insights.questionAverages.map((question) => (
          <QuestionRow key={question.questionId} question={question} weakestId={weakestId} />
        ))}
      </View>

      <View style={styles.insightCard}>
        <Text style={styles.insightText}>
          <Text style={styles.insightBold}>AI insight: </Text>
          {insights.insightMessage}
        </Text>
        {refreshMutation.data ? (
          <Text style={styles.refreshNote}>{refreshMutation.data.insightMessage}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btnOutline, refreshMutation.isPending && styles.btnDisabled]}
          onPress={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending || insights.evaluatedCount === 0}
          accessibilityRole="button"
          accessibilityLabel="Refresh mastery heatmap from evaluated marks"
        >
          <Text style={styles.btnOutlineText}>
            {refreshMutation.isPending ? 'Refreshing…' : 'Refresh heatmap'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.btnPrimary}
          onPress={() =>
            router.push({
              pathname: '/mastery-heatmap',
              params: { courseCode, examType },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="View mastery heatmap"
        >
          <Text style={styles.btnPrimaryText}>View heatmap</Text>
        </Pressable>
      </View>

      <PublishMarksPanel courseCode={courseCode} examType={examType} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  loading: { alignItems: 'center', padding: 24, gap: 8 },
  loadingText: { fontSize: 12, color: '#666' },
  errorCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5D78E',
  },
  errorTitle: { fontSize: 12, color: '#8A5A00', marginBottom: 8 },
  retry: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
  statusGrid: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  statusCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusValue: { fontSize: 16, fontWeight: '700' },
  statusLabel: { fontSize: 9, color: '#888', marginTop: 2 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  distRow: { marginBottom: 8 },
  distHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  distLabel: { fontSize: 11, color: '#444', flex: 1 },
  distCount: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EDF2F7',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  emptyHint: { fontSize: 10, color: '#888', marginTop: 4 },
  qRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  qLabel: { fontSize: 11, color: '#444', flex: 1 },
  qAvg: { fontSize: 11, fontWeight: '700', color: '#0F6E56' },
  qAvgWeak: { color: '#A32D2D' },
  insightCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  insightText: { fontSize: 11, color: '#7F1D1D', lineHeight: 16 },
  insightBold: { fontWeight: '700' },
  refreshNote: { fontSize: 10, color: '#0F6E56', marginTop: 6, lineHeight: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnOutline: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  btnOutlineText: { fontSize: 11, fontWeight: '700', color: BRAND_PRIMARY },
  btnPrimary: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  btnDisabled: { opacity: 0.6 },
});
