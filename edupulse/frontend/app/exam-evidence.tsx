import { ExamEvidencePanel } from '@/src/components/ExamEvidencePanel';
import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExamEvidenceScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.StudentDiagnosisRead);
  const { usn, courseCode, examType } = useLocalSearchParams<{
    usn?: string;
    courseCode?: string;
    examType?: string;
  }>();

  const resolvedCourse = courseCode ?? 'BCS301';
  const resolvedExam = examType ?? 'IA-2';

  if (!allowed) {
    return <AccessDenied message="Exam evidence is available to enrolled students." />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>
            {resolvedExam} · {resolvedCourse}
          </Text>
        </View>

        <View style={styles.body}>
          <ExamEvidencePanel courseCode={resolvedCourse} examType={resolvedExam} usn={usn} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F8FA' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    gap: 8,
  },
  back: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  body: { padding: 16 },
});
