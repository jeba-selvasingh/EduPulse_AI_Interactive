import {
  fetchInterventionPriority,
  interventionCompletionLabel,
  interventionUrgencyStyle,
  updateInterventionCompletion,
  type InterventionCompletionStatus,
  type InterventionFocus,
  type InterventionItem,
  type InterventionPriorityView,
} from '@/src/lib/campus-api';
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

function FocusChips({
  view,
  onSelect,
}: {
  view: InterventionPriorityView;
  onSelect: (focus: InterventionFocus) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {view.availableFocuses.map((focus) => {
        const active = view.activeFocus === focus.id;
        return (
          <Pressable
            key={focus.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(focus.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{focus.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function InterventionCard({
  item,
  onStatusChange,
  updating,
}: {
  item: InterventionItem;
  onStatusChange: (status: InterventionCompletionStatus) => void;
  updating: boolean;
}) {
  const tone = interventionUrgencyStyle(item.urgency);
  const completionLabel = interventionCompletionLabel(item.completionStatus);

  return (
    <View style={[styles.card, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.pill, { backgroundColor: tone.pillBackground }]}>
          <Text style={[styles.pillText, { color: tone.pillColor }]}>{item.urgencyLabel}</Text>
        </View>
      </View>
      <Text style={styles.cardDescription}>{item.description}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Owner: {item.owner}</Text>
        <Text style={styles.metaText}>Cohort: {item.cohortSize}</Text>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.statusPill, item.completionStatus === 'completed' && styles.statusDone]}>
          <Text style={styles.statusText}>
            {completionLabel}
            {item.completionPercent != null ? ` · ${item.completionPercent}%` : ''}
          </Text>
        </View>
        {item.completionNote ? <Text style={styles.noteText}>{item.completionNote}</Text> : null}
      </View>
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionBtn, updating && styles.actionBtnDisabled]}
          onPress={() => onStatusChange('in_progress')}
          disabled={updating || item.completionStatus === 'completed'}
        >
          <Text style={styles.actionBtnText}>Mark in progress</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtnPrimary, updating && styles.actionBtnDisabled]}
          onPress={() => onStatusChange('completed')}
          disabled={updating || item.completionStatus === 'completed'}
        >
          <Text style={styles.actionBtnPrimaryText}>Mark complete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function InterventionPriorityPanel({ focus }: { focus?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['intervention-priority', focus ?? 'all'],
    queryFn: () => fetchInterventionPriority(focus),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      interventionId,
      status,
    }: {
      interventionId: string;
      status: InterventionCompletionStatus;
    }) =>
      updateInterventionCompletion(interventionId, {
        status,
        completionPercent: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention-priority'] });
    },
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
        <Text style={styles.errorText}>Unable to load intervention priority list.</Text>
      </View>
    );
  }

  const view = query.data;

  const handleFocusSelect = (nextFocus: InterventionFocus) => {
    if (nextFocus === 'all') {
      router.push('/intervention-priority' as never);
      return;
    }
    router.push(`/intervention-priority?focus=${nextFocus}` as never);
  };

  return (
    <View>
      <Text style={styles.batchLabel}>{view.batchLabel} · ranked by urgency</Text>
      <FocusChips view={view} onSelect={handleFocusSelect} />

      {view.interventions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No interventions match this cohort filter.</Text>
        </View>
      ) : (
        view.interventions.map((item) => (
          <InterventionCard
            key={item.id}
            item={item}
            updating={updateMutation.isPending}
            onStatusChange={(status) =>
              updateMutation.mutate({ interventionId: item.id, status })
            }
          />
        ))
      )}

      <View style={styles.forecastCard}>
        <Text style={styles.forecastTitle}>Recovery forecast</Text>
        <Text style={styles.forecastSummary}>{view.recoveryForecast.summary}</Text>
        <View style={styles.forecastStats}>
          <Text style={styles.forecastStat}>
            {view.recoveryForecast.currentPlacementPercent}% →{' '}
            {view.recoveryForecast.projectedPlacementPercent}%
          </Text>
          <Text style={styles.forecastStat}>
            +{view.recoveryForecast.additionalOffers} offers if all complete
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  errorText: { fontSize: 12, color: '#B3261E' },
  batchLabel: { fontSize: 11, color: '#666', marginBottom: 8 },
  chipScroll: { marginBottom: 12 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  chipText: { fontSize: 11, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#FFF' },
  card: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: '700' },
  cardDescription: { fontSize: 11, color: '#555', lineHeight: 16, marginTop: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaText: { fontSize: 10, color: '#777' },
  statusRow: { marginTop: 8, gap: 4 },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDone: { backgroundColor: '#E1F5EE' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#444' },
  noteText: { fontSize: 10, color: '#666' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: BRAND_PRIMARY },
  actionBtnPrimary: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnPrimaryText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  actionBtnDisabled: { opacity: 0.6 },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, color: '#666' },
  forecastCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  forecastTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  forecastSummary: { fontSize: 11, color: '#555', lineHeight: 16 },
  forecastStats: { marginTop: 8, gap: 4 },
  forecastStat: { fontSize: 10, color: '#0F6E56', fontWeight: '600' },
});
