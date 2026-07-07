import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  onPress: () => void;
  verified?: boolean;
  compact?: boolean;
};

export function TrustCardTrigger({ onPress, verified = true, compact }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, compact && styles.pillCompact]}
      accessibilityRole="button"
      accessibilityLabel="View trust card"
    >
      <Text style={styles.icon}>🛡</Text>
      <Text style={styles.label}>{verified ? 'Trust card' : 'Trust card'}</Text>
      {verified ? <Text style={styles.badge}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEEDFE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  pillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_PRIMARY,
  },
  badge: {
    fontSize: 10,
    color: '#0F6E56',
    fontWeight: '700',
  },
});
