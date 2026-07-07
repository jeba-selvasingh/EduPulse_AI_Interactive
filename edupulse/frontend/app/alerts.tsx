import {
  alertSeverityStyle,
  fetchAlertInbox,
  markAlertRead,
  type AlertItem,
} from '@/src/lib/dean-pulse-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function AlertCard({
  item,
  onCta,
  onMarkRead,
}: {
  item: AlertItem;
  onCta: (item: AlertItem) => void;
  onMarkRead: (id: string) => void;
}) {
  const tone = alertSeverityStyle(item.severity);

  return (
    <Pressable
      style={[styles.card, tone, !item.isRead && styles.unread]}
      onPress={() => !item.isRead && onMarkRead(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardTime}>{item.relativeTime}</Text>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      {item.ctaLabel && item.ctaRoute ? (
        <Pressable style={styles.cta} onPress={() => onCta(item)}>
          <Text style={styles.ctaText}>{item.ctaLabel}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alert-inbox'],
    queryFn: fetchAlertInbox,
  });

  const readMutation = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alert-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });

  const onCta = (item: AlertItem) => {
    if (item.ctaRoute) {
      router.push(item.ctaRoute as '/campus-drive' | '/paper-craft');
    }
  };

  const unreadCount = data?.unreadCount ?? 0;
  const alerts = data?.alerts ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Alerts</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount} new</Text>
            </View>
          ) : (
            <View style={styles.badgeSpacer} />
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {alerts.length === 0 ? (
              <Text style={styles.empty}>No alerts for your role.</Text>
            ) : (
              alerts.map((item) => (
                <AlertCard
                  key={item.id}
                  item={item}
                  onCta={onCta}
                  onMarkRead={(id) => readMutation.mutate(id)}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
  },
  back: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600', marginRight: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  badge: {
    backgroundColor: '#E24B4A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  badgeSpacer: { width: 48 },
  loader: { marginTop: 24 },
  content: { padding: 16, gap: 10 },
  empty: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 24 },
  card: {
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: BRAND_PRIMARY },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: { fontWeight: '700', fontSize: 13, flex: 1 },
  cardTime: { fontSize: 10, color: '#888', marginLeft: 8 },
  cardBody: { fontSize: 12, color: '#666', lineHeight: 18 },
  cta: { marginTop: 8, alignSelf: 'flex-start' },
  ctaText: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
});
