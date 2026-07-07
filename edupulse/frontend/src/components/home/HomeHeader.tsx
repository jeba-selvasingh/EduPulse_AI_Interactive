import { APP_NAME, BRAND_PRIMARY, BRAND_PRIMARY_LIGHT } from '@/src/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  firstName: string;
  subtitle: string;
  unreadAlertCount: number;
  onAlertsPress: () => void;
};

export function HomeHeader({ firstName, subtitle, unreadAlertCount, onAlertsPress }: Props) {
  return (
    <>
      <View style={styles.logoBar}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>EP</Text>
        </View>
        <Text style={styles.epTag}>{APP_NAME}</Text>
      </View>

      <View style={styles.hdr}>
        <View style={styles.hdrText}>
          <Text style={styles.greeting}>Good morning, {firstName} 👋</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={onAlertsPress}
          style={styles.bellBtn}
          accessibilityRole="button"
          accessibilityLabel={`Alerts${unreadAlertCount > 0 ? `, ${unreadAlertCount} unread` : ''}`}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadAlertCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  logoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BRAND_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontWeight: '900',
    color: BRAND_PRIMARY,
    fontSize: 14,
  },
  epTag: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: '700',
    color: BRAND_PRIMARY,
    letterSpacing: 0.5,
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  hdrText: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  bellIcon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E24B4A',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
