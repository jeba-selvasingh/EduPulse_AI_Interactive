import { ACCESS_DENIED_MESSAGE } from '@/src/lib/rbac';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AccessDeniedProps = {
  featureName?: string;
  message?: string;
  onGoBack?: () => void;
};

export function AccessDenied({ featureName, message, onGoBack }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Access denied</Text>
        {featureName ? (
          <Text style={styles.feature}>{featureName} is not available for your role.</Text>
        ) : null}
        <Text style={styles.body}>{message ?? ACCESS_DENIED_MESSAGE}</Text>
        <Pressable
          style={styles.btn}
          onPress={onGoBack ?? (() => router.back())}
        >
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  feature: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
