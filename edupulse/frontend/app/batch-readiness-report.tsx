import { AccessDenied } from '@/src/components/AccessDenied';
import { BatchReadinessReportPanel } from '@/src/components/BatchReadinessReportPanel';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BatchReadinessReportScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.CampusDriveRead);

  if (!allowed) {
    return <AccessDenied featureName="Batch readiness report" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            Batch readiness report
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <BatchReadinessReportPanel />
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
