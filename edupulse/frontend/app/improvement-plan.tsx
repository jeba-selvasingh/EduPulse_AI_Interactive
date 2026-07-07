import { EightWeekPlanPanel } from '@/src/components/EightWeekPlanPanel';
import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { fetchImprovementPlan } from '@/src/lib/diagnosis-api';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ImprovementPlanScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.StudentDiagnosisRead);
  const { usn, courseCode } = useLocalSearchParams<{ usn?: string; courseCode?: string }>();

  const headerQuery = useQuery({
    queryKey: ['improvement-plan-header', usn ?? 'self'],
    queryFn: () => fetchImprovementPlan({ usn, courseCode }),
    enabled: allowed,
  });

  if (!allowed) {
    return <AccessDenied message="Improvement plan is available to enrolled students." />;
  }

  const weekLabel = headerQuery.data?.currentWeekLabel ?? '8-week plan';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>8-week plan</Text>
          <Text style={styles.weekPill}>{weekLabel}</Text>
        </View>

        <View style={styles.body}>
          <EightWeekPlanPanel usn={usn} courseCode={courseCode} />
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
  weekPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3C3489',
    backgroundColor: '#EEEDFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  body: { padding: 16 },
});
