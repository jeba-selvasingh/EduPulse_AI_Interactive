import { ConceptDiagnosisPanel } from '@/src/components/ConceptDiagnosisPanel';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { AccessDenied } from '@/src/components/AccessDenied';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudentDiagnosisScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.StudentDiagnosisRead);
  const { usn, coTag, courseCode, examType } = useLocalSearchParams<{
    usn?: string;
    coTag?: string;
    courseCode?: string;
    examType?: string;
  }>();

  const resolvedCourse = courseCode ?? (coTag ? 'BCS304' : 'BCS301');

  if (!allowed) {
    return <AccessDenied message="Concept diagnosis is available to enrolled students." />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>{resolvedCourse} · concept map</Text>
        </View>

        <View style={styles.body}>
          <ConceptDiagnosisPanel
            courseCode={resolvedCourse}
            usn={usn}
            coTag={coTag}
            examType={examType}
          />
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
