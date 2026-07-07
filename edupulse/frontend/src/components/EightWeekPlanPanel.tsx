import {
  fetchImprovementPlan,
  milestoneStatusStyle,
  type PlanMilestone,
} from '@/src/lib/diagnosis-api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  usn?: string;
  courseCode?: string;
};

function MilestoneCard({ milestone }: { milestone: PlanMilestone }) {
  const status = milestoneStatusStyle(milestone.status);
  const isActive = milestone.status === 'now';

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.row}>
        <Text style={styles.title}>
          {milestone.status === 'done' ? '✓ ' : ''}
          {milestone.weekLabel} · {milestone.title}
        </Text>
        <View style={[styles.pill, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.description}>{milestone.description}</Text>
      {milestone.facultyAttribution ? (
        <Text style={styles.attribution}>
          Updated by {milestone.facultyAttribution.facultyName}
        </Text>
      ) : null}
    </View>
  );
}

export function EightWeekPlanPanel({ usn, courseCode }: Props) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['improvement-plan', usn ?? 'self', courseCode ?? 'all', 'milestones'],
    queryFn: () => fetchImprovementPlan({ usn, courseCode }),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading 8-week plan…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load plan'}
        </Text>
      </View>
    );
  }

  const plan = query.data;

  return (
    <View>
      {plan.milestones.map((milestone) => (
        <MilestoneCard key={milestone.itemId} milestone={milestone} />
      ))}

      <View style={styles.progressCard}>
        <View style={styles.row}>
          <Text style={styles.progressLabel}>Plan completion</Text>
          <Text style={styles.progressValue}>{plan.completionPercent}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${plan.completionPercent}%` }]} />
        </View>
        <Text style={styles.placementInsight}>{plan.placementInsight}</Text>
      </View>

      <Pressable
        style={styles.cta}
        onPress={() => router.push(plan.progressRoute as '/progress-tracking')}
      >
        <Text style={styles.ctaText}>View progress →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: '#888' },
  errorText: { fontSize: 13, color: '#9B1C1C', textAlign: 'center', paddingHorizontal: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  cardActive: {
    backgroundColor: '#F7F6FF',
    borderColor: '#C4B5FD',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
  description: { fontSize: 12, color: '#4A5568', lineHeight: 18 },
  attribution: { marginTop: 8, fontSize: 10, color: '#534AB7', fontWeight: '600' },
  progressCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  progressLabel: { fontSize: 12, color: '#4A5568' },
  progressValue: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  track: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
  },
  fill: { height: '100%', backgroundColor: '#534AB7', borderRadius: 999 },
  placementInsight: { fontSize: 11, color: '#4A5568', lineHeight: 16 },
  cta: {
    backgroundColor: '#534AB7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
