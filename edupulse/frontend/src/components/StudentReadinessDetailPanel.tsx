import {
  fetchStudentReadiness,
  readinessTierPillStyle,
  type InterventionModuleLink,
  type StudentReadinessDetailView,
} from '@/src/lib/campus-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function ReadinessRing({ percent }: { percent: number }) {
  return (
    <View style={styles.ring}>
      <Text style={styles.ringText}>{percent}%</Text>
    </View>
  );
}

function BreakdownRow({
  label,
  score,
  maxScore,
  isWeak,
}: {
  label: string;
  score: number;
  maxScore: number;
  isWeak: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownScore, isWeak && styles.breakdownScoreWeak]}>
        {score}/{maxScore}
      </Text>
    </View>
  );
}

function InterventionLink({ module, onPress }: { module: InterventionModuleLink; onPress: () => void }) {
  const isUrgent = module.priority === 'urgent';
  const isHigh = module.priority === 'high';

  return (
    <Pressable
      style={[
        styles.interventionLink,
        isUrgent && styles.interventionUrgent,
        isHigh && styles.interventionHigh,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.interventionText,
          isUrgent && styles.interventionTextUrgent,
        ]}
      >
        {module.label} →
      </Text>
    </Pressable>
  );
}

function DetailContent({ view }: { view: StudentReadinessDetailView }) {
  const router = useRouter();
  const pill = readinessTierPillStyle(view.tier);

  const navigateRoute = (route: string) => {
    const [path, query] = route.split('?');
    if (query) {
      const params = Object.fromEntries(new URLSearchParams(query));
      router.push({ pathname: path as never, params });
      return;
    }
    router.push(path as never);
  };

  return (
    <View>
      <Text style={styles.studentTitle}>
        {view.name} · {view.departmentLabel} {view.batchLabel}
      </Text>
      <View style={styles.heroRow}>
        <ReadinessRing percent={view.readinessPercent} />
        <View style={styles.heroMeta}>
          <View style={[styles.pill, { backgroundColor: pill.backgroundColor }]}>
            <Text style={[styles.pillText, { color: pill.color }]}>{view.tierLabel}</Text>
          </View>
          <Text style={styles.trendLabel}>{view.trendLabel}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Score breakdown</Text>
        {view.breakdown.map((item) => (
          <BreakdownRow
            key={item.key}
            label={item.label}
            score={item.score}
            maxScore={item.maxScore}
            isWeak={item.key === 'communication' && item.score < 6}
          />
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardHeading}>Company fit</Text>
          <Text style={styles.eligibleCount}>
            {view.eligibleCompanyCount} of {view.totalCompanies} eligible
          </Text>
        </View>
        <Text style={styles.bodyText}>{view.companyFitSummary}</Text>
        <Text style={[styles.bodyText, styles.gapText]}>{view.gapAnalysis}</Text>
      </View>

      <View style={[styles.card, styles.gapPlanCard]}>
        <Text style={styles.cardHeading}>{view.gapPlanTitle}</Text>
        <Text style={styles.bodyText}>{view.gapPlanSummary}</Text>
      </View>

      <Text style={styles.sectionTitle}>Intervention modules</Text>
      {view.interventionModules.map((module) => (
        <InterventionLink
          key={module.id}
          module={module}
          onPress={() => navigateRoute(module.route)}
        />
      ))}

      <Pressable
        style={styles.evalButton}
        onPress={() => navigateRoute(view.evaluationRoute)}
      >
        <Text style={styles.evalButtonText}>View full evaluation →</Text>
      </Pressable>
    </View>
  );
}

export function StudentReadinessDetailPanel({ usn }: { usn: string }) {
  const query = useQuery({
    queryKey: ['student-readiness', usn],
    queryFn: () => fetchStudentReadiness(usn),
    enabled: Boolean(usn),
  });

  if (!usn) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Student USN is required</Text>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
        <Text style={styles.loadingText}>Loading student readiness…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load student detail'}
        </Text>
      </View>
    );
  }

  return <DetailContent view={query.data} />;
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { fontSize: 11, color: '#666', marginTop: 8 },
  errorText: { fontSize: 12, color: '#B3261E', textAlign: 'center' },
  studentTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: BRAND_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  ringText: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  heroMeta: { flex: 1, gap: 4 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
  trendLabel: { fontSize: 11, color: '#666' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  gapPlanCard: { backgroundColor: '#F3F0FF', borderColor: '#CECBF6' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  cardHeading: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eligibleCount: { fontSize: 11, fontWeight: '700', color: '#0F6E56' },
  bodyText: { fontSize: 11, color: '#666', marginTop: 2 },
  gapText: { color: '#444', marginTop: 6 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: 11, color: '#444', flex: 1 },
  breakdownScore: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  breakdownScoreWeak: { color: '#A32D2D' },
  interventionLink: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  interventionUrgent: { borderColor: '#F09595', backgroundColor: '#FFF8F8' },
  interventionHigh: { borderColor: '#E8C468', backgroundColor: '#FFFBF0' },
  interventionText: { fontSize: 11, fontWeight: '600', color: BRAND_PRIMARY },
  interventionTextUrgent: { color: '#A32D2D' },
  evalButton: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  evalButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
