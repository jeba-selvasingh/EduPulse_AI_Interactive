import { fetchCampusHome } from '@/src/lib/campus-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function CampusDriveHomePanel() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['campus-home'],
    queryFn: fetchCampusHome,
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Unable to load campus recruitment home.</Text>
      </View>
    );
  }

  const home = query.data;

  return (
    <View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Batch strength</Text>
          <Text style={styles.statValue}>{home.batchStrength}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Dream ready</Text>
          <Text style={[styles.statValue, styles.statGreen]}>{home.dreamReadyCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Drive days left</Text>
          <Text style={[styles.statValue, styles.statAmber]}>{home.driveDaysLeft}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Offers received</Text>
          <Text style={[styles.statValue, styles.statPurple]}>{home.offersReceived}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Campus readiness modules</Text>

      <Pressable style={styles.moduleCard} onPress={() => router.push('/company-eligibility')}>
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>📋 Eligibility & company tracker</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          {home.companyCount} companies · {home.scheduledDrives} drives scheduled ·{' '}
          {home.newCompaniesThisMonth} new this month
        </Text>
      </Pressable>

      <Pressable style={styles.moduleCard} onPress={() => router.push('/readiness-board')}>
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>📊 Readiness tier board</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          Dream / Core / Mass / At-risk counts · explainable weights · {home.dreamReadyCount} dream
          ready
        </Text>
      </Pressable>

      <Pressable
        style={styles.moduleCard}
        onPress={() => router.push('/training-dashboards?track=aptitude')}
      >
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>🧠 Aptitude training plan</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          Quantitative · logical · verbal · data interpretation
        </Text>
      </Pressable>

      <Pressable
        style={styles.moduleCard}
        onPress={() => router.push('/training-dashboards?track=soft-skills')}
      >
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>💬 Soft skills & GD/PI prep</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          Group discussion · HR interview · communication skills
        </Text>
      </Pressable>

      <Pressable
        style={styles.moduleCard}
        onPress={() => router.push('/training-dashboards?track=technical')}
      >
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>💻 Technical skill builder</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>DSA · coding rounds · domain tech tracks</Text>
      </Pressable>

      <Pressable style={styles.moduleCard} onPress={() => router.push('/drive-calendar')}>
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>📅 Drive calendar & alerts</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          Upcoming drives · registration deadlines · WhatsApp reminders
        </Text>
      </Pressable>

      <Pressable style={styles.moduleCard} onPress={() => router.push('/batch-readiness-report')}>
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>📈 Batch readiness report</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          Tier distribution · dept gaps · recovery forecast · PDF/Excel export
        </Text>
      </Pressable>

      <Pressable style={styles.moduleCard} onPress={() => router.push('/intervention-priority')}>
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>🎯 Intervention priority list</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          Ranked recovery actions · cohort filters · completion tracking
        </Text>
      </Pressable>

      <Pressable style={styles.moduleCard} onPress={() => router.push('/mock-test-schedule')}>
        <View style={styles.moduleRow}>
          <Text style={styles.moduleTitle}>📝 Mock test schedule</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.moduleSubtitle}>
          TCS/Infosys patterns · registration · auto-grade · batch score trends
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  errorText: { fontSize: 12, color: '#B3261E' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    flexGrow: 1,
  },
  statLabel: { fontSize: 10, color: '#888' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 2 },
  statGreen: { color: '#0F6E56' },
  statAmber: { color: '#BA7517' },
  statPurple: { color: '#534AB7' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#444', marginBottom: 8 },
  moduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
    marginBottom: 8,
  },
  moduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  chevron: { fontSize: 18, color: BRAND_PRIMARY },
  moduleSubtitle: { fontSize: 11, color: '#666', marginTop: 4 },
});
