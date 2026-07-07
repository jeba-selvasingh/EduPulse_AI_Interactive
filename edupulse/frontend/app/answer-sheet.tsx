import { AccessDenied } from '@/src/components/AccessDenied';
import { EvaluationWorkflowDashboardPanel } from '@/src/components/EvaluationWorkflowDashboard';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { fetchEvaluationDashboard } from '@/src/lib/evaluation-api';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_COURSE = 'BCS304';
const DEFAULT_EXAM = 'IA-2';

export default function AnswerSheetScreen() {
  const router = useRouter();
  const { paperId, courseCode, examType } = useLocalSearchParams<{
    paperId?: string;
    courseCode?: string;
    examType?: string;
  }>();
  const allowed = usePermission(Permission.AnswerSheetAi);
  const displayCourse = courseCode ?? DEFAULT_COURSE;
  const displayExam = examType ?? DEFAULT_EXAM;

  const dashboardQuery = useQuery({
    queryKey: ['evaluation-dashboard', displayCourse, displayExam, paperId],
    queryFn: () => fetchEvaluationDashboard(displayCourse, displayExam, paperId),
    enabled: allowed,
  });

  if (!allowed) {
    return <AccessDenied featureName="Answer Sheet AI" />;
  }

  const dashboard = dashboardQuery.data;
  const badge =
    dashboard?.available && dashboard.progress
      ? `${dashboard.progress.uploaded}/${dashboard.totalStudents} uploaded`
      : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            Answer Sheet AI · {displayCourse}
          </Text>
          <Text style={styles.badge}>{badge}</Text>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {dashboardQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : dashboardQuery.isError ? (
            <Text style={styles.errorText}>Could not load evaluation workflow.</Text>
          ) : dashboard ? (
            <EvaluationWorkflowDashboardPanel
              dashboard={dashboard}
              onScanPress={() =>
                router.push({
                  pathname: '/sheet-capture',
                  params: {
                    courseCode: displayCourse,
                    examType: displayExam,
                    ...(paperId ? { paperId } : {}),
                  },
                })
              }
              onBulkUploadPress={() =>
                router.push({
                  pathname: '/bulk-upload',
                  params: {
                    courseCode: displayCourse,
                    examType: displayExam,
                    ...(paperId ? { paperId } : {}),
                  },
                })
              }
              onEvaluatePress={() =>
                router.push({
                  pathname: '/sheet-evaluation',
                  params: {
                    courseCode: displayCourse,
                    examType: displayExam,
                    ...(paperId ? { paperId } : {}),
                  },
                })
              }
              onFacultyReviewPress={() =>
                router.push({
                  pathname: '/faculty-review',
                  params: {
                    courseCode: displayCourse,
                    examType: displayExam,
                    ...(paperId ? { paperId } : {}),
                  },
                })
              }
              onBatchInsightsPress={() =>
                router.push({
                  pathname: '/batch-evaluation',
                  params: {
                    courseCode: displayCourse,
                    examType: displayExam,
                  },
                })
              }
              onModerationPress={
                paperId
                  ? () =>
                      router.push({
                        pathname: '/paper-moderation',
                        params: { paperId, courseCode: displayCourse },
                      })
                  : undefined
              }
            />
          ) : null}
        </ScrollView>
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
    color: '#085041',
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  loader: { marginTop: 24 },
  errorText: { fontSize: 12, color: '#A32D2D', marginTop: 16 },
});
