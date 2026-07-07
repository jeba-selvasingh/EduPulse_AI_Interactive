import { AccessDenied } from '@/src/components/AccessDenied';
import { TrainingModuleDashboardsPanel } from '@/src/components/TrainingModuleDashboardsPanel';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TRACK_TITLES: Record<string, string> = {
  aptitude: 'Aptitude training plan',
  'soft-skills': 'Soft skills & GD/PI prep',
  technical: 'Technical skill builder',
};

export default function TrainingDashboardsScreen() {
  const router = useRouter();
  const { track } = useLocalSearchParams<{ track?: string }>();
  const allowed = usePermission(Permission.CampusDriveRead);
  const trackValue = typeof track === 'string' ? track : undefined;
  const title = trackValue ? (TRACK_TITLES[trackValue] ?? 'Training dashboards') : 'Training dashboards';

  if (!allowed) {
    return <AccessDenied featureName="Training module dashboards" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <TrainingModuleDashboardsPanel track={trackValue} />
        </ScrollView>
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
    gap: 8,
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
  },
  back: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  body: { padding: 16 },
});
