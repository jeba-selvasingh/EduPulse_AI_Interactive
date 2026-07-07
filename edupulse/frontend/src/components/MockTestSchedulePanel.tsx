import {
  fetchMockTestSchedule,
  mockTestStatusStyle,
  registerForMockTest,
  scheduleMockTest,
  submitMockTestObjectives,
  type MockTestEntry,
  type MockTestScheduleView,
  type MockTestTrendPoint,
} from '@/src/lib/campus-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function TrendChart({ points }: { points: MockTestTrendPoint[] }) {
  const max = Math.max(...points.map((point) => point.batchAvgScore), 1);

  return (
    <View style={styles.trendCard}>
      <Text style={styles.sectionTitle}>Score trend · batch avg</Text>
      <View style={styles.trendRow}>
        {points.map((point) => (
          <View key={point.label} style={styles.trendCol}>
            <View style={styles.trendTrack}>
              <View
                style={[
                  styles.trendBar,
                  {
                    height: `${Math.round((point.batchAvgScore / max) * 100)}%`,
                    backgroundColor: point.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.trendLabel}>
              {point.label}
              {'\n'}
              {point.batchAvgScore}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MockCard({
  mock,
  onRegister,
  registering,
}: {
  mock: MockTestEntry;
  onRegister: (mockId: string) => void;
  registering: boolean;
}) {
  const status = mockTestStatusStyle(mock.status);

  return (
    <View style={[styles.mockCard, mock.highlighted && styles.mockCardHighlight]}>
      <View style={styles.row}>
        <Text style={styles.mockTitle}>{mock.title}</Text>
        <View style={[styles.pill, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.pillText, { color: status.color }]}>{mock.statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.mockDescription}>{mock.description}</Text>
      {mock.canRegister ? (
        <Pressable
          style={[styles.registerBtn, registering && styles.btnDisabled]}
          onPress={() => onRegister(mock.mockId)}
          disabled={registering}
        >
          <Text style={styles.registerBtnText}>Register cohort</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MockTestSchedulePanel() {
  const queryClient = useQueryClient();
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [gradingMessage, setGradingMessage] = useState<string | null>(null);
  const [patternLabel, setPatternLabel] = useState('Cognizant pattern');
  const [dateLabel, setDateLabel] = useState('2 Sep');

  const query = useQuery({
    queryKey: ['mock-test-schedule'],
    queryFn: fetchMockTestSchedule,
  });

  const registerMutation = useMutation({
    mutationFn: registerForMockTest,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mock-test-schedule'] });
      setScheduleMessage(`Registered cohort · ${result.registeredCount} students for ${result.mockId}`);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      scheduleMockTest({
        patternLabel,
        dateLabel,
        focus: 'Full aptitude + coding',
        durationMinutes: 90,
        sections: ['Quant', 'Logical', 'Verbal', 'Coding'],
      }),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['mock-test-schedule'] });
      setScheduleMessage(`Scheduled ${detail.title}`);
    },
  });

  const gradeMutation = useMutation({
    mutationFn: () => submitMockTestObjectives('mock-5', 89),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mock-test-schedule'] });
      setGradingMessage(
        `Auto-graded ${result.gradedCount} submissions in ${result.gradingCompletedInMinutes} min · avg ${result.batchAvgScore} · SLA ${result.gradingWithinSla ? 'met' : 'missed'}`,
      );
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
        <Text style={styles.errorText}>Unable to load mock test schedule.</Text>
      </View>
    );
  }

  const view: MockTestScheduleView = query.data;

  return (
    <View>
      <View style={styles.nextCard}>
        <View style={styles.row}>
          <Text style={styles.nextTitle}>{view.nextMock.title}</Text>
          <View style={[styles.pill, styles.pillPurple]}>
            <Text style={[styles.pillText, styles.pillPurpleText]}>{view.nextMock.scheduleLabel}</Text>
          </View>
        </View>
        <Text style={styles.nextDescription}>{view.nextMock.description}</Text>
      </View>

      <Text style={styles.sectionTitle}>This month&apos;s schedule · {view.monthLabel}</Text>
      {view.schedule.map((mock) => (
        <MockCard
          key={mock.mockId}
          mock={mock}
          onRegister={(mockId) => registerMutation.mutate(mockId)}
          registering={registerMutation.isPending}
        />
      ))}

      <TrendChart points={view.scoreTrend} />

      <View style={styles.actionCard}>
        <Text style={styles.sectionTitle}>Schedule new mock</Text>
        <TextInput
          style={styles.input}
          value={patternLabel}
          onChangeText={setPatternLabel}
          placeholder="Pattern label"
        />
        <TextInput
          style={styles.input}
          value={dateLabel}
          onChangeText={setDateLabel}
          placeholder="Date label"
        />
        <Pressable
          style={[styles.primaryBtn, scheduleMutation.isPending && styles.btnDisabled]}
          onPress={() => scheduleMutation.mutate()}
          disabled={scheduleMutation.isPending}
        >
          <Text style={styles.primaryBtnText}>Schedule mock test</Text>
        </Pressable>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.sectionTitle}>Simulate objective submissions</Text>
        <Text style={styles.hint}>
          Pilot auto-grading completes within {view.nextMock.resultsSlaHours} hours for objective
          sections.
        </Text>
        <Pressable
          style={[styles.primaryBtn, gradeMutation.isPending && styles.btnDisabled]}
          onPress={() => gradeMutation.mutate()}
          disabled={gradeMutation.isPending}
        >
          <Text style={styles.primaryBtnText}>Run auto-grade for Mock 5</Text>
        </Pressable>
        {gradingMessage ? <Text style={styles.successText}>{gradingMessage}</Text> : null}
      </View>

      {scheduleMessage ? <Text style={styles.successText}>{scheduleMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  errorText: { fontSize: 12, color: '#B3261E' },
  nextCard: {
    backgroundColor: '#F6F4FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4CFF7',
  },
  nextTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  nextDescription: { fontSize: 11, color: '#555', marginTop: 6, lineHeight: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#444', marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  mockCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  mockCardHighlight: { borderWidth: 1.5, borderColor: BRAND_PRIMARY },
  mockTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  mockDescription: { fontSize: 11, color: '#666', marginTop: 6, lineHeight: 16 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: '700' },
  pillPurple: { backgroundColor: '#EEEDFE' },
  pillPurpleText: { color: '#3C3489' },
  registerBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  registerBtnText: { fontSize: 11, fontWeight: '700', color: BRAND_PRIMARY },
  trendCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  trendRow: { flexDirection: 'row', gap: 8, height: 72, alignItems: 'flex-end' },
  trendCol: { flex: 1, alignItems: 'center' },
  trendTrack: {
    width: '100%',
    height: 52,
    justifyContent: 'flex-end',
    backgroundColor: '#F7F8FA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBar: { width: '100%', borderRadius: 2 },
  trendLabel: { fontSize: 9, color: '#888', marginTop: 4, textAlign: 'center' },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: '#FFF',
  },
  hint: { fontSize: 11, color: '#666', lineHeight: 16 },
  primaryBtn: {
    borderRadius: 8,
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  btnDisabled: { opacity: 0.6 },
  successText: { fontSize: 11, color: '#0F6E56', marginBottom: 12 },
});
