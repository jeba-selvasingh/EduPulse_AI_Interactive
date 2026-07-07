import { AccessDenied } from '@/src/components/AccessDenied';
import { RivalFeedPanel } from '@/src/components/RivalFeedPanel';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RivalFeedScreen() {
  const router = useRouter();
  const allowed = usePermission(Permission.CollegeRadarRead);

  if (!allowed) {
    return <AccessDenied featureName="Rival Feed" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <RivalFeedPanel />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  back: { paddingHorizontal: 16, paddingTop: 8 },
  backText: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
});
