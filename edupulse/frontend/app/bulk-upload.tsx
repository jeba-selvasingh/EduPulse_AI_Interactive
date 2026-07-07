import { AccessDenied } from '@/src/components/AccessDenied';
import { BulkUploadPanel } from '@/src/components/BulkUploadPanel';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_COURSE = 'BCS304';
const DEFAULT_EXAM = 'IA-2';

export default function BulkUploadScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paperId, courseCode, examType } = useLocalSearchParams<{
    paperId?: string;
    courseCode?: string;
    examType?: string;
  }>();
  const allowed = usePermission(Permission.AnswerSheetAi);
  const displayCourse = courseCode ?? DEFAULT_COURSE;
  const displayExam = examType ?? DEFAULT_EXAM;

  const onUploaded = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['evaluation-dashboard', displayCourse, displayExam, paperId],
    });
  }, [queryClient, displayCourse, displayExam, paperId]);

  if (!allowed) {
    return <AccessDenied featureName="Bulk sheet upload" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            Upload scanned sheets
          </Text>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <BulkUploadPanel
            courseCode={displayCourse}
            examType={displayExam}
            paperId={paperId}
            onUploaded={onUploaded}
          />
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
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
});
