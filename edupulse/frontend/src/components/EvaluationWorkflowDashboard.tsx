import type { EvaluationWorkflowDashboard } from '@/src/lib/evaluation-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  dashboard: EvaluationWorkflowDashboard;
  onModerationPress?: () => void;
  onScanPress?: () => void;
  onBulkUploadPress?: () => void;
  onEvaluatePress?: () => void;
  onFacultyReviewPress?: () => void;
  onBatchInsightsPress?: () => void;
};

function ProgressRow({
  label,
  count,
  total,
  percent,
  fillColor,
}: {
  label: string;
  count: number;
  total: number;
  percent: number;
  fillColor: string;
}) {
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressCount}>
          {count} / {total}
        </Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
        <View style={[styles.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

export function EvaluationWorkflowDashboardPanel({
  dashboard,
  onModerationPress,
  onScanPress,
  onBulkUploadPress,
  onEvaluatePress,
  onFacultyReviewPress,
  onBatchInsightsPress,
}: Props) {
  const { progress, percentComplete, totalStudents } = dashboard;

  return (
    <View style={styles.wrap}>
      <View style={styles.examCard}>
        <View style={styles.examHeader}>
          <Text style={styles.examTitle}>
            {dashboard.courseCode} · {dashboard.examType}
          </Text>
          {dashboard.available ? (
            <Text style={styles.approvedPill}>Paper approved</Text>
          ) : (
            <Text style={styles.lockedPill}>Moderation pending</Text>
          )}
        </View>
        <Text style={styles.examMeta}>
          {dashboard.questionCount != null && dashboard.totalMarks != null
            ? `${dashboard.totalMarks} marks · ${dashboard.questionCount} questions · `
            : ''}
          {totalStudents} students
        </Text>
      </View>

      {!dashboard.available ? (
        <View style={styles.lockCard}>
          <Text style={styles.lockTitle}>Workflow locked</Text>
          <Text style={styles.lockBody}>{dashboard.message}</Text>
          {onModerationPress ? (
            <Pressable style={styles.lockBtn} onPress={onModerationPress} accessibilityRole="button">
              <Text style={styles.lockBtnText}>View moderation status →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Evaluation workflow</Text>
          <Pressable
            style={styles.actionCard}
            onPress={onScanPress}
            accessibilityRole="button"
            accessibilityLabel="Scan and capture sheets"
          >
            <Text style={styles.actionIcon}>📸</Text>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Scan & capture sheets</Text>
              <Text style={styles.actionSub}>Use phone camera with corner detection and USN scan</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable
            style={styles.actionCardMuted}
            onPress={onBulkUploadPress}
            accessibilityRole="button"
            accessibilityLabel="Upload PDF or ZIP"
          >
            <Text style={styles.actionIcon}>📤</Text>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Upload scanned PDF / ZIP</Text>
              <Text style={styles.actionSub}>Bulk upload from copy center · USN-named files</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable
            style={styles.actionCardMuted}
            onPress={onEvaluatePress}
            accessibilityRole="button"
            accessibilityLabel="Run AI rubric evaluation"
          >
            <Text style={styles.actionIcon}>🤖</Text>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>AI rubric evaluation</Text>
              <Text style={styles.actionSub}>Score sheets with marks, rationale, and confidence</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.actionCardMuted}
            onPress={onFacultyReviewPress}
            accessibilityRole="button"
            accessibilityLabel="Review flagged questions"
          >
            <Text style={styles.actionIcon}>⚠️</Text>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Faculty review panel</Text>
              <Text style={styles.actionSub}>Review flagged items · accept or override AI marks</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.actionCardMuted}
            onPress={onBatchInsightsPress}
            accessibilityRole="button"
            accessibilityLabel="Open batch evaluation dashboard"
          >
            <Text style={styles.actionIcon}>📊</Text>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Batch evaluation dashboard</Text>
              <Text style={styles.actionSub}>Score distribution · question averages · heatmap refresh</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Evaluation progress</Text>
          <View style={styles.progressCard}>
            <ProgressRow
              label="Sheets uploaded"
              count={progress.uploaded}
              total={totalStudents}
              percent={percentComplete.uploaded}
              fillColor="#534AB7"
            />
            <ProgressRow
              label="AI evaluated"
              count={progress.aiEvaluated}
              total={totalStudents}
              percent={percentComplete.aiEvaluated}
              fillColor="#5DCAA5"
            />
            <ProgressRow
              label="Faculty reviewed"
              count={progress.facultyReviewed}
              total={totalStudents}
              percent={percentComplete.facultyReviewed}
              fillColor="#FAC775"
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  examCard: {
    backgroundColor: '#EEEDFE',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4D0F5',
    marginBottom: 8,
  },
  examHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  examTitle: { fontSize: 13, fontWeight: '700', color: '#3C3489', flex: 1 },
  approvedPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#534AB7',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockedPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A5A00',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  examMeta: { fontSize: 11, color: '#666', marginTop: 4, lineHeight: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginTop: 10,
    marginBottom: 6,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#534AB7',
    marginBottom: 8,
    gap: 8,
  },
  actionCardMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 8,
  },
  actionIcon: { fontSize: 18 },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  actionSub: { fontSize: 10, color: '#666', marginTop: 2, lineHeight: 14 },
  chevron: { fontSize: 16, color: BRAND_PRIMARY, fontWeight: '700' },
  progressCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressBlock: { marginBottom: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 11, color: '#444' },
  progressCount: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EDF2F7',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  lockCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5D78E',
    marginTop: 8,
  },
  lockTitle: { fontSize: 14, fontWeight: '700', color: '#8A5A00', marginBottom: 6 },
  lockBody: { fontSize: 12, color: '#666', lineHeight: 18 },
  lockBtn: { marginTop: 12 },
  lockBtnText: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
});
