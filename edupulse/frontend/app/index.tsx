import { AccessDenied } from '@/src/components/AccessDenied';
import { AttentionList } from '@/src/components/home/AttentionList';
import { HomeHeader } from '@/src/components/home/HomeHeader';
import { HomeTabBar } from '@/src/components/home/HomeTabBar';
import {
  QuickActionGrid,
  type QuickActionTile,
} from '@/src/components/home/QuickActionGrid';
import { StatsRow } from '@/src/components/home/StatsRow';
import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { useHomeSummary } from '@/src/hooks/useHomeSummary';
import { recordUserActivity } from '@/src/hooks/useSessionTimeout';
import type { AttentionItem } from '@/src/lib/home-api';
import { useAuthStore } from '@/src/stores/auth';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FALLBACK_STATS = { papersThisSem: 12, hoursSaved: 38 };
const FALLBACK_ATTENTION: AttentionItem[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'IA-2 paper awaiting moderation',
    subtitle: 'BCS304 Data Structures · due today',
    severity: 'amber',
    trustCardId: '10000000-0000-4000-8000-000000000001',
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    title: '12 students weak in CO3',
    subtitle: 'BCS304 · Mastery heatmap updated',
    severity: 'red',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const roles = user?.roles ?? [];
  const { data, isLoading } = useHomeSummary();

  const [deniedFeature, setDeniedFeature] = useState<string | null>(null);
  const [trustCardOpen, setTrustCardOpen] = useState(false);
  const [trustCardId, setTrustCardId] = useState<string | null>(null);

  const stats = data?.stats ?? FALLBACK_STATS;
  const unreadAlertCount = data?.unreadAlertCount ?? 3;
  const attentionItems = data?.attentionItems ?? FALLBACK_ATTENTION;

  const subtitle =
    roles.includes('faculty') || roles.includes('admin')
      ? 'Dept. of CSE · Odd Sem 2026'
      : `${roles.join(' · ') || 'EduPulse'} · Odd Sem 2026`;

  const onQuickAction = useCallback(
    (action: QuickActionTile) => {
      recordUserActivity();
      if (action.route) {
        router.push(action.route);
        return;
      }
      setDeniedFeature(action.label);
    },
    [router],
  );

  const onAttentionPress = useCallback((item: AttentionItem) => {
    recordUserActivity();
    if (item.trustCardId) {
      setTrustCardId(item.trustCardId);
      setTrustCardOpen(true);
    }
  }, []);

  const onAlertsPress = useCallback(() => {
    recordUserActivity();
    router.push('/alerts');
  }, [router]);

  const onLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [logout, router]);

  if (deniedFeature) {
    return (
      <AccessDenied
        featureName={deniedFeature}
        onGoBack={() => setDeniedFeature(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.phoneShell}>
        <HomeHeader
          firstName={user?.name?.split(' ')[0] ?? 'there'}
          subtitle={subtitle}
          unreadAlertCount={unreadAlertCount}
          onAlertsPress={onAlertsPress}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          onScrollBeginDrag={recordUserActivity}
          onTouchStart={recordUserActivity}
        >
          {isLoading ? (
            <ActivityIndicator style={styles.loader} color="#534AB7" />
          ) : null}

          <StatsRow stats={stats} />

          <QuickActionGrid roles={roles} onPress={onQuickAction} />

          <AttentionList items={attentionItems} onItemPress={onAttentionPress} />

          {roles.includes('student') ? (
            <Text style={styles.roleHint}>
              Student view — faculty tools are hidden on your home screen.
            </Text>
          ) : null}

          {roles.includes('admin') ? (
            <>
              <Pressable
                style={styles.adminLink}
                onPress={() => router.push('/admin/cohort-import')}
              >
                <Text style={styles.adminLinkText}>Import pilot cohort (admin)</Text>
              </Pressable>
              <Pressable
                style={styles.adminLink}
                onPress={() => router.push('/admin/operations')}
              >
                <Text style={styles.adminLinkText}>Exam-window operations (admin)</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable style={styles.logoutLink} onPress={onLogout}>
            <Text style={styles.logoutLinkText}>Sign out</Text>
          </Pressable>
        </ScrollView>

        <HomeTabBar activeTab="home" onTabPress={(tab) => {
          if (tab === 'home') return;
          if (tab === 'papers') {
            onQuickAction(
              { id: 'paper-craft', label: 'Paper Craft', route: '/paper-craft' } as QuickActionTile,
            );
          }
          if (tab === 'campus') {
            router.push('/campus-drive');
          }
          if (tab === 'principal') {
            router.push('/dean-pulse');
          }
        }} />
      </View>

      <TrustCardSlideOver
        artifactId={trustCardId}
        visible={trustCardOpen}
        onClose={() => setTrustCardOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#E8E8EE',
    alignItems: 'center',
  },
  phoneShell: {
    flex: 1,
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#F7F7FA',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loader: {
    marginBottom: 12,
  },
  roleHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  adminLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  adminLinkText: {
    fontSize: 12,
    color: '#534AB7',
    fontWeight: '600',
  },
  logoutLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  logoutLinkText: {
    color: '#888',
    fontSize: 12,
  },
});
