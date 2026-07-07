import { BRAND_PRIMARY } from '@/src/constants/theme';
import { fetchCourseRoster, type CourseRoster } from '@/src/lib/cohort-api';
import {
  analyzeSheetCapture,
  confirmSheetCapture,
  defaultCaptureCorners,
  type SheetCaptureAnalyze,
} from '@/src/lib/evaluation-api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
  paperId?: string;
  onSaved?: (usn: string) => void;
};

const POOR_CORNERS: [number, number][] = [
  [0.5, 0.5],
  [0.52, 0.5],
];

export function SheetCapturePanel({ courseCode, examType, paperId, onSaved }: Props) {
  const [analyzeResult, setAnalyzeResult] = useState<SheetCaptureAnalyze | null>(null);
  const [selectedUsn, setSelectedUsn] = useState<string | null>(null);
  const [simulatePoorFraming, setSimulatePoorFraming] = useState(false);
  const [simulateMissingUsn, setSimulateMissingUsn] = useState(false);

  const rosterQuery = useQuery({
    queryKey: ['course-roster', courseCode, 'capture'],
    queryFn: () => fetchCourseRoster(courseCode),
  });

  const analyzeMutation = useMutation({
    mutationFn: () =>
      analyzeSheetCapture(
        courseCode,
        examType,
        {
          cornerPoints: simulatePoorFraming ? POOR_CORNERS : defaultCaptureCorners(),
          headerText: simulateMissingUsn ? 'Answer sheet page 1' : 'USN: PES1UG23CS042',
        },
        paperId,
      ),
    onSuccess: (result) => {
      setAnalyzeResult(result);
      setSelectedUsn(result.usnDetected);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (usn: string) =>
      confirmSheetCapture(
        courseCode,
        examType,
        { captureId: analyzeResult!.captureId, usn },
        paperId,
      ),
    onSuccess: (result) => {
      onSaved?.(result.usn);
      setAnalyzeResult(null);
      setSelectedUsn(null);
    },
  });

  const roster = rosterQuery.data;
  const canConfirm =
    analyzeResult?.cornersDetected &&
    selectedUsn &&
    (analyzeResult.usnDetected || analyzeResult.requiresManualUsn);

  return (
    <View style={styles.wrap}>
      <View style={styles.viewfinder} accessibilityLabel="Camera viewfinder">
        <View style={[styles.corner, styles.cornerTl]} />
        <View style={[styles.corner, styles.cornerTr]} />
        <View style={[styles.corner, styles.cornerBl]} />
        <View style={[styles.corner, styles.cornerBr]} />
        <Text style={styles.viewfinderHint}>Point camera at answer sheet</Text>
        <Text style={styles.viewfinderSub}>Hold steady · full page in frame · good lighting</Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggle, simulatePoorFraming && styles.toggleActive]}
          onPress={() => setSimulatePoorFraming((value) => !value)}
          accessibilityRole="switch"
          accessibilityState={{ checked: simulatePoorFraming }}
        >
          <Text style={styles.toggleText}>Simulate poor framing</Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, simulateMissingUsn && styles.toggleActive]}
          onPress={() => setSimulateMissingUsn((value) => !value)}
          accessibilityRole="switch"
          accessibilityState={{ checked: simulateMissingUsn }}
        >
          <Text style={styles.toggleText}>Simulate missing USN</Text>
        </Pressable>
      </View>

      {analyzeResult?.cornerWarning ? (
        <View style={styles.warnCard} accessibilityRole="alert">
          <Text style={styles.warnTitle}>Reposition sheet</Text>
          <Text style={styles.warnBody}>{analyzeResult.cornerWarning}</Text>
        </View>
      ) : null}

      {analyzeResult?.cornersDetected ? (
        <View style={styles.resultCard}>
          {analyzeResult.usnDetected ? (
            <Text style={styles.detectedUsn}>
              USN detected: <Text style={styles.detectedUsnValue}>{analyzeResult.usnDetected}</Text>
              {analyzeResult.usnConfidence != null
                ? ` (${Math.round(analyzeResult.usnConfidence * 100)}% confidence)`
                : ''}
            </Text>
          ) : (
            <ManualUsnPicker
              roster={roster}
              selectedUsn={selectedUsn}
              onSelect={setSelectedUsn}
              isLoading={rosterQuery.isLoading}
            />
          )}
        </View>
      ) : null}

      <Pressable
        style={[styles.captureBtn, analyzeMutation.isPending && styles.captureBtnDisabled]}
        onPress={() => analyzeMutation.mutate()}
        disabled={analyzeMutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Capture sheet"
      >
        {analyzeMutation.isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.captureBtnText}>📸 Capture sheet</Text>
        )}
      </Pressable>

      {canConfirm ? (
        <Pressable
          style={[styles.confirmBtn, confirmMutation.isPending && styles.captureBtnDisabled]}
          onPress={() => confirmMutation.mutate(selectedUsn!)}
          disabled={confirmMutation.isPending}
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>
            {confirmMutation.isPending ? 'Saving…' : `Save sheet for ${selectedUsn}`}
          </Text>
        </Pressable>
      ) : null}

      {confirmMutation.isSuccess ? (
        <Text style={styles.successText}>Sheet saved and queued for AI evaluation.</Text>
      ) : null}
    </View>
  );
}

function ManualUsnPicker({
  roster,
  selectedUsn,
  onSelect,
  isLoading,
}: {
  roster?: CourseRoster;
  selectedUsn: string | null;
  onSelect: (usn: string) => void;
  isLoading: boolean;
}) {
  const students = useMemo(() => roster?.students ?? [], [roster?.students]);

  if (isLoading) return <ActivityIndicator color={BRAND_PRIMARY} />;

  return (
    <View>
      <Text style={styles.manualTitle}>USN not detected — assign manually</Text>
      <FlatList
        data={students.slice(0, 8)}
        keyExtractor={(item) => item.usn}
        style={styles.usnList}
        nestedScrollEnabled
        renderItem={({ item }) => (
          <Pressable
            style={[styles.usnRow, selectedUsn === item.usn && styles.usnRowSelected]}
            onPress={() => onSelect(item.usn)}
            accessibilityRole="button"
          >
            <Text style={styles.usnValue}>{item.usn}</Text>
            <Text style={styles.usnName}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  viewfinder: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#5DCAA5',
  },
  cornerTl: { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTr: { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBl: { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBr: { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3 },
  viewfinderHint: { color: '#FFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  viewfinderSub: { color: '#A0AEC0', fontSize: 11, marginTop: 6, textAlign: 'center', lineHeight: 16 },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  toggleActive: { borderColor: BRAND_PRIMARY, backgroundColor: '#E6F1FB' },
  toggleText: { fontSize: 10, fontWeight: '600', color: '#444' },
  warnCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5D78E',
  },
  warnTitle: { fontSize: 12, fontWeight: '700', color: '#8A5A00', marginBottom: 4 },
  warnBody: { fontSize: 11, color: '#666', lineHeight: 16 },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detectedUsn: { fontSize: 12, color: '#444' },
  detectedUsnValue: { fontWeight: '700', color: '#0F6E56' },
  manualTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  usnList: { maxHeight: 180 },
  usnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#F7F7FA',
  },
  usnRowSelected: { backgroundColor: '#E1F5EE', borderWidth: 1, borderColor: '#5DCAA5' },
  usnValue: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  usnName: { fontSize: 11, color: '#666' },
  captureBtn: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.7 },
  captureBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: '#0F6E56',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  successText: { fontSize: 11, color: '#0F6E56', fontWeight: '600' },
});
