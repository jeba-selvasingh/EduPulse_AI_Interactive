import {
  fetchReadinessBoard,
  readinessTierPillStyle,
  updateReadinessWeights,
  type ReadinessTierBoardView,
  type ReadinessWeights,
  type StudentTierCard,
  type TierSummary,
} from '@/src/lib/campus-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function TierStatCard({ tier }: { tier: TierSummary }) {
  return (
    <View style={styles.tierStatCard}>
      <Text style={[styles.tierStatValue, { color: tier.color }]}>{tier.count}</Text>
      <Text style={styles.tierStatLabel}>{tier.label}</Text>
    </View>
  );
}

function TierBar({ tier }: { tier: TierSummary }) {
  return (
    <View style={styles.tierBarRow}>
      <View style={styles.tierBarHeader}>
        <Text style={styles.tierBarLabel}>{tier.label}</Text>
        <Text style={[styles.tierBarCount, { color: tier.color }]}>
          {tier.count} · {tier.percent}%
        </Text>
      </View>
      <View style={styles.tierTrack}>
        <View
          style={[styles.tierFill, { width: `${tier.barPercent}%`, backgroundColor: tier.color }]}
        />
      </View>
    </View>
  );
}

function StudentCard({ student }: { student: StudentTierCard }) {
  const router = useRouter();
  const pill = readinessTierPillStyle(student.tier);

  return (
    <Pressable
      style={[styles.studentCard, student.isAtRisk && styles.studentCardRisk]}
      onPress={() => router.push(student.detailRoute as never)}
    >
      <View style={styles.row}>
        <Text style={styles.studentName}>
          {student.name} · {student.cgpa.toFixed(1)} CGPA
        </Text>
        <View style={[styles.pill, { backgroundColor: pill.backgroundColor }]}>
          <Text style={[styles.pillText, { color: pill.color }]}>
            {student.tierLabel} {student.readinessPercent}%
          </Text>
        </View>
      </View>
      {student.gapSummary ? (
        <Text style={[styles.gapText, student.isAtRisk && styles.gapTextRisk]}>
          {student.gapSummary}
        </Text>
      ) : null}
    </Pressable>
  );
}

function WeightEditor({
  weights,
  bounds,
  onSave,
  isSaving,
}: {
  weights: ReadinessWeights;
  bounds: ReadinessWeights;
  onSave: (next: ReadinessWeights) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<ReadinessWeights>(weights);

  const fields: Array<{ key: keyof ReadinessWeights; label: string }> = [
    { key: 'academics', label: 'Academics' },
    { key: 'coding', label: 'Coding' },
    { key: 'certs', label: 'Certs' },
    { key: 'communication', label: 'Communication' },
  ];

  return (
    <View style={styles.weightCard}>
      <Text style={styles.sectionTitle}>Tune readiness weights</Text>
      {fields.map((field) => (
        <View key={field.key} style={styles.weightRow}>
          <Text style={styles.weightLabel}>{field.label}</Text>
          <TextInput
            style={styles.weightInput}
            keyboardType="numeric"
            value={String(draft[field.key])}
            onChangeText={(value) => {
              const parsed = Number(value);
              if (!Number.isNaN(parsed)) {
                setDraft((current) => ({ ...current, [field.key]: parsed }));
              }
            }}
          />
          <Text style={styles.weightBounds}>
            {field.key === 'academics' ? '15–35' : field.key === 'coding' ? '10–30' : field.key === 'certs' ? '5–25' : '5–20'}
          </Text>
        </View>
      ))}
      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        disabled={isSaving}
        onPress={() => onSave(draft)}
      >
        <Text style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Apply weights'}</Text>
      </Pressable>
    </View>
  );
}

function BreakdownCard({ view }: { view: ReadinessTierBoardView }) {
  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.sectionTitle}>Explainable score breakdown</Text>
      {view.sampleBreakdown.map((item) => (
        <View key={item.key} style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{item.label}</Text>
          <Text style={styles.breakdownScore}>
            {item.score}/{item.maxScore}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ReadinessTierBoardPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['readiness-board'],
    queryFn: fetchReadinessBoard,
  });

  const mutation = useMutation({
    mutationFn: updateReadinessWeights,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['readiness-board'] });
    },
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
        <Text style={styles.loadingText}>Loading readiness tier board…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load readiness board'}
        </Text>
      </View>
    );
  }

  const view = query.data;

  return (
    <View>
      <Text style={styles.batchTitle}>
        Placement readiness · {view.departmentLabel} {view.batchLabel}
      </Text>

      <View style={styles.tierGrid}>
        {view.tiers.map((tier) => (
          <TierStatCard key={tier.tier} tier={tier} />
        ))}
      </View>

      <View style={styles.distributionCard}>
        <Text style={styles.sectionTitle}>Tier distribution</Text>
        {view.tiers.map((tier) => (
          <TierBar key={`bar-${tier.tier}`} tier={tier} />
        ))}
      </View>

      {view.featuredStudents.map((student) => (
        <StudentCard key={student.usn} student={student} />
      ))}

      <BreakdownCard view={view} />

      <WeightEditor
        weights={view.weights}
        bounds={view.weightBounds}
        isSaving={mutation.isPending}
        onSave={(next) => mutation.mutate(next)}
      />

      <Text style={styles.caption}>{view.weightCaption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { fontSize: 11, color: '#666', marginTop: 8 },
  errorText: { fontSize: 12, color: '#B3261E' },
  batchTitle: { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 10 },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tierStatCard: {
    width: '23%',
    flexGrow: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tierStatValue: { fontSize: 16, fontWeight: '700' },
  tierStatLabel: { fontSize: 9, color: '#888', marginTop: 2 },
  distributionCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  tierBarRow: { marginBottom: 8 },
  tierBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tierBarLabel: { fontSize: 11, color: '#444' },
  tierBarCount: { fontSize: 11, fontWeight: '700' },
  tierTrack: {
    height: 6,
    backgroundColor: '#ECECF2',
    borderRadius: 999,
    overflow: 'hidden',
  },
  tierFill: { height: '100%', borderRadius: 999 },
  studentCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  studentCardRisk: {
    borderColor: '#F09595',
    backgroundColor: '#FFF8F8',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  studentName: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
  gapText: { fontSize: 11, color: '#666', marginTop: 4 },
  gapTextRisk: { color: '#A32D2D' },
  breakdownCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: 11, color: '#444' },
  breakdownScore: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  weightCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  weightLabel: { flex: 1, fontSize: 11, color: '#444' },
  weightInput: {
    width: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: '#FAFAFC',
  },
  weightBounds: { fontSize: 9, color: '#888', width: 42 },
  saveButton: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  caption: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4 },
});
