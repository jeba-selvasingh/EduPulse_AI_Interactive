import { BRAND_PRIMARY } from '@/src/constants/theme';
import type { AvailabilityBanner } from '@/src/lib/availability-api';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  banner: AvailabilityBanner;
  onDismiss?: () => void;
};

export function MaintenanceBanner({ banner, onDismiss }: Props) {
  if (!banner.visible) {
    return null;
  }

  const isMaintenance = banner.kind === 'maintenance';
  const backgroundColor = isMaintenance ? '#FFF4E5' : '#EEEDFE';
  const borderColor = isMaintenance ? '#F5A623' : BRAND_PRIMARY;
  const textColor = isMaintenance ? '#7A4E00' : '#3C3489';

  return (
    <View style={[styles.wrap, { backgroundColor, borderLeftColor: borderColor }]}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: textColor }]}>
          {isMaintenance ? 'Scheduled maintenance' : 'Exam window active'}
        </Text>
        {banner.title ? (
          <Text style={[styles.subtitle, { color: textColor }]}>{banner.title}</Text>
        ) : null}
        {banner.message ? (
          <Text style={[styles.message, { color: textColor }]}>{banner.message}</Text>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text style={styles.dismiss}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    gap: 8,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  dismiss: {
    fontSize: 14,
    color: '#888',
    paddingTop: 2,
  },
});
