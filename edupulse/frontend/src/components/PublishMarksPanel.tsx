import { BRAND_PRIMARY } from '@/src/constants/theme';
import { MarksCsvExportPanel } from '@/src/components/MarksCsvExportPanel';
import {
  fetchPublishStatus,
  publishEvaluatedMarks,
  type PendingReviewItem,
} from '@/src/lib/evaluation-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
};

function PendingReviewList({ items }: { items: PendingReviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.pendingCard}>
      <Text style={styles.pendingTitle}>Pending reviews ({items.length})</Text>
      {items.slice(0, 5).map((item) => (
        <Text key={`${item.usn}-${item.questionId}`} style={styles.pendingRow}>
          {item.usn} · {item.questionKey}
        </Text>
      ))}
      {items.length > 5 ? (
        <Text style={styles.pendingMore}>+{items.length - 5} more flagged items</Text>
      ) : null}
    </View>
  );
}

export function PublishMarksPanel({ courseCode, examType }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['publish-status', courseCode, examType],
    queryFn: () => fetchPublishStatus(courseCode, examType),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishEvaluatedMarks(courseCode, examType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publish-status', courseCode, examType] });
      void queryClient.invalidateQueries({ queryKey: ['marks-grid', courseCode, examType] });
      void queryClient.invalidateQueries({ queryKey: ['mastery-heatmap', courseCode, examType] });
      void queryClient.invalidateQueries({ queryKey: ['batch-insights', courseCode, examType] });
    },
  });

  const status = statusQuery.data;
  const publishError =
    publishMutation.error instanceof Error ? publishMutation.error.message : null;

  if (statusQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={BRAND_PRIMARY} />
      </View>
    );
  }

  if (!status) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Publish to Mark Matrix</Text>
      <View style={styles.card}>
        <Text style={styles.message}>{status.message}</Text>
        {status.isPublished ? (
          <View style={styles.publishedPill}>
            <Text style={styles.publishedPillText}>Published · read-only</Text>
          </View>
        ) : null}
        <PendingReviewList items={status.pendingReviews} />
        {publishError ? <Text style={styles.errorText}>{publishError}</Text> : null}
        {publishMutation.data ? (
          <Text style={styles.successText}>{publishMutation.data.message}</Text>
        ) : null}

        <View style={styles.actions}>
          {!status.isPublished ? (
            <Pressable
              style={[
                styles.publishBtn,
                (!status.canPublish || publishMutation.isPending) && styles.btnDisabled,
              ]}
              onPress={() => publishMutation.mutate()}
              disabled={!status.canPublish || publishMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Publish evaluated marks"
            >
              <Text style={styles.publishBtnText}>
                {publishMutation.isPending ? 'Publishing…' : 'Publish marks'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.outlineBtn}
              onPress={() => router.push('/mark-matrix')}
              accessibilityRole="button"
              accessibilityLabel="Open Mark Matrix"
            >
              <Text style={styles.outlineBtnText}>Open Mark Matrix →</Text>
            </Pressable>
          )}
          {status.pendingReviews.length > 0 ? (
            <Pressable
              style={styles.outlineBtn}
              onPress={() =>
                router.push({
                  pathname: '/faculty-review',
                  params: { courseCode, examType },
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.outlineBtnText}>Review flagged items</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {status.isPublished ? (
        <MarksCsvExportPanel courseCode={courseCode} examType={examType} isPublished />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  loading: { padding: 16, alignItems: 'center' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  message: { fontSize: 12, color: '#444', lineHeight: 18 },
  publishedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6FFFA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  publishedPillText: { fontSize: 10, fontWeight: '700', color: '#0F6E56' },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F5D78E',
  },
  pendingTitle: { fontSize: 11, fontWeight: '700', color: '#8A5A00', marginBottom: 4 },
  pendingRow: { fontSize: 10, color: '#666', lineHeight: 16 },
  pendingMore: { fontSize: 10, color: '#888', marginTop: 2 },
  errorText: { fontSize: 11, color: '#A32D2D' },
  successText: { fontSize: 11, color: '#0F6E56', lineHeight: 16 },
  actions: { gap: 8, marginTop: 4 },
  publishBtn: {
    borderRadius: 8,
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 11,
    alignItems: 'center',
  },
  publishBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  outlineBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  outlineBtnText: { fontSize: 11, fontWeight: '700', color: BRAND_PRIMARY },
  btnDisabled: { opacity: 0.55 },
});
