import { CampusDriveHomePanel } from '@/src/components/CampusDriveHomePanel';
import { AccessDenied } from '@/src/components/AccessDenied';
import { HomeTabBar } from '@/src/components/home/HomeTabBar';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CampusDriveScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.CampusDriveRead);

  if (!allowed) {
    return <AccessDenied featureName="Campus Recruitment" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Text style={styles.title}>🎯 Campus Recruitment</Text>
          <View style={styles.batchPill}>
            <Text style={styles.batchPillText}>2027 batch</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <CampusDriveHomePanel />
        </ScrollView>

        <HomeTabBar
          activeTab="campus"
          onTabPress={(tab) => {
            if (tab === 'home') router.push('/');
            if (tab === 'principal') router.push('/dean-pulse');
            if (tab === 'papers') router.push('/paper-craft');
          }}
        />
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  batchPill: {
    backgroundColor: '#EEEDFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  batchPillText: { fontSize: 10, fontWeight: '700', color: BRAND_PRIMARY },
  body: { padding: 16, paddingBottom: 8 },
});
