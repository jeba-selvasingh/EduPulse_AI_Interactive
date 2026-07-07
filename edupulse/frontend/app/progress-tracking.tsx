import { ProgressTrackingPanel, ProgressTrendPill } from '@/src/components/ProgressTrackingPanel';
import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { fetchProgressTracking, trendLabelStyle } from '@/src/lib/diagnosis-api';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProgressTrackingScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.StudentDiagnosisRead);
  const { usn } = useLocalSearchParams<{ usn?: string }>();

  const headerQuery = useQuery({
    queryKey: ['progress-tracking-header', usn ?? 'self'],
    queryFn: () => fetchProgressTracking(usn),
    enabled: allowed,
  });

  if (!allowed) {
    return <AccessDenied message="Progress tracking is available to enrolled students." />;
  }

  const studentName = headerQuery.data?.studentName ?? 'Student';
  const trendPill = trendLabelStyle(headerQuery.data?.readinessTrendLabel ?? 'improving');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Progress · {studentName}</Text>
          <ProgressTrendPill label={trendPill} />
        </View>

        <View style={styles.body}>
          <ProgressTrackingPanel usn={usn} />
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
