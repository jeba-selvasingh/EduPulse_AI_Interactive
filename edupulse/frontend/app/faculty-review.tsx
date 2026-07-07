import { AccessDenied } from '@/src/components/AccessDenied';
import { FacultyReviewPanel } from '@/src/components/FacultyReviewPanel';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_COURSE = 'BCS304';
const DEFAULT_EXAM = 'IA-2';

export default function FacultyReviewScreen() {
  const router = useRouter();
  const { paperId, courseCode, examType, usn, questionId } = useLocalSearchParams<{
    paperId?: string;
    courseCode?: string;
    examType?: string;
    usn?: string;
    questionId?: string;
  }>();
  const allowed = usePermission(Permission.AnswerSheetAi);
  const displayCourse = courseCode ?? DEFAULT_COURSE;
  const displayExam = examType ?? DEFAULT_EXAM;

  if (!allowed) {
    return <AccessDenied featureName="Faculty review panel" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            Faculty review
          </Text>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.lead}>
            Review low-confidence AI marks with the scanned snippet. Accept the AI score or override
            with a required faculty note.
          </Text>
          <FacultyReviewPanel
            courseCode={displayCourse}
            examType={displayExam}
            usn={usn}
            questionId={questionId}
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
  lead: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 8 },
});
