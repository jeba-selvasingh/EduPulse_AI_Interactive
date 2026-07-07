import {
  fetchTrainingDashboards,
  trainingModuleToneStyle,
  type TrainingDashboardsView,
  type TrainingModuleMetric,
  type TrainingTrackSummary,
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

function ModuleCard({ module }: { module: TrainingModuleMetric }) {
  const tone = trainingModuleToneStyle(module.statusTone);

  return (
    <View style={[styles.moduleCard, module.isWeakestInTrack && styles.moduleCardWeak]}>
      <View style={styles.row}>
        <Text style={styles.moduleTitle}>{module.label}</Text>
        <View style={[styles.pill, { backgroundColor: tone.backgroundColor }]}>
          <Text style={[styles.pillText, { color: tone.color }]}>{module.statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.moduleDescription}>{module.description}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${module.batchAvgPercent}%`, backgroundColor: tone.barColor },
          ]}
        />
      </View>
      <Text style={styles.moduleMeta}>
        Batch avg: {module.batchAvgPercent}% · target: {module.targetPercent}%
      </Text>
    </View>
  );
}

function TrackOverviewCard({
  track,
  isWeakest,
  onPress,
}: {
  track: TrainingTrackSummary;
  isWeakest: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.trackCard, isWeakest && styles.trackCardWeakest]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <Text style={styles.trackTitle}>{track.title}</Text>
        {isWeakest ? (
          <View style={styles.weakestPill}>
            <Text style={styles.weakestPillText}>Weakest area</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.trackSubtitle}>{track.subtitle}</Text>
      <View style={styles.row}>
        <Text style={styles.batchAvg}>{track.batchAvgLabel}</Text>
        <Text style={styles.benchmark}>
          Benchmark {track.benchmarkPercent}%
        </Text>
      </View>
      <Text style={styles.gapSummary}>{track.gapSummary}</Text>
    </Pressable>
  );
}

function TrackDetail({ track }: { track: TrainingTrackSummary }) {
  const router = useRouter();

  return (
    <View>
      <View style={[styles.summaryCard, track.track === 'soft_skills' && styles.summaryCardRisk]}>
        <View style={styles.row}>
          <Text style={styles.summaryTitle}>Batch {track.title.toLowerCase()}</Text>
          <Text style={styles.summaryValue}>{track.batchAvgLabel}</Text>
        </View>
        <Text style={styles.gapSummary}>{track.gapSummary}</Text>
      </View>

      <Text style={styles.sectionTitle}>Training modules</Text>
      {track.modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}

      <Pressable
        style={styles.interventionButton}
        onPress={() => router.push(track.interventionRoute as never)}
      >
        <Text style={styles.interventionButtonText}>View intervention priority list →</Text>
      </Pressable>
    </View>
  );
}

function DashboardContent({ view }: { view: TrainingDashboardsView }) {
  const router = useRouter();

  if (view.activeTrack && view.tracks.length === 1) {
    return <TrackDetail track={view.tracks[0]} />;
  }

  return (
    <View>
      <View style={styles.weakestBanner}>
        <Text style={styles.weakestBannerTitle}>Intervention focus</Text>
        <Text style={styles.weakestBannerText}>{view.interventionSummary}</Text>
      </View>

      {view.tracks.map((track) => (
        <TrackOverviewCard
          key={track.track}
          track={track}
          isWeakest={track.track === view.weakestTrackId}
          onPress={() => router.push(track.detailRoute as never)}
        />
      ))}

      <Pressable
        style={styles.interventionButton}
        onPress={() => router.push(view.interventionPriorityRoute as never)}
      >
        <Text style={styles.interventionButtonText}>Open intervention priority list →</Text>
      </Pressable>
    </View>
  );
}

export function TrainingModuleDashboardsPanel({ track }: { track?: string }) {
  const query = useQuery({
    queryKey: ['training-dashboards', track ?? 'all'],
    queryFn: () => fetchTrainingDashboards(track),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
        <Text style={styles.loadingText}>Loading training dashboards…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load training dashboards'}
        </Text>
      </View>
    );
  }

  return <DashboardContent view={query.data} />;
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { fontSize: 11, color: '#666', marginTop: 8 },
  errorText: { fontSize: 12, color: '#B3261E', textAlign: 'center' },
  weakestBanner: {
    backgroundColor: '#F3F0FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CECBF6',
  },
  weakestBannerTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  weakestBannerText: { fontSize: 11, color: '#444' },
  trackCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  trackCardWeakest: {
    borderColor: '#FAC775',
    backgroundColor: '#FFFBF0',
  },
  trackTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  trackSubtitle: { fontSize: 11, color: '#666', marginTop: 4, marginBottom: 6 },
  batchAvg: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
  benchmark: { fontSize: 11, color: '#666' },
  gapSummary: { fontSize: 11, color: '#666', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  weakestPill: {
    backgroundColor: '#FFF4E5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weakestPillText: { fontSize: 10, fontWeight: '700', color: '#8A5A00' },
  summaryCard: {
    backgroundColor: '#F3F0FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  summaryCardRisk: {
    backgroundColor: '#FFF8F8',
    borderColor: '#F09595',
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  summaryValue: { fontSize: 11, fontWeight: '700', color: BRAND_PRIMARY },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  moduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  moduleCardWeak: {
    borderColor: '#FAC775',
    backgroundColor: '#FFFBF0',
  },
  moduleTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  moduleDescription: { fontSize: 11, color: '#666', marginTop: 4, marginBottom: 6 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
  track: {
    height: 6,
    backgroundColor: '#ECECF2',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  moduleMeta: { fontSize: 9, color: '#888', marginTop: 4 },
  interventionButton: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  interventionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
