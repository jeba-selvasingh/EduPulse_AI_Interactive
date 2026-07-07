import { AccessDenied } from '@/src/components/AccessDenied';
import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { TrustCardTrigger } from '@/src/components/TrustCardTrigger';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchBlueprint,
  saveBlueprint,
  sumBloom,
  sumDifficulty,
  type BloomTargets,
  type BlueprintView,
  type DifficultyProfile,
} from '@/src/lib/blueprint-api';
import { fetchPaperCraftModules, requestPaperCraftGenerate } from '@/src/lib/features-api';
import type { SyllabusGenerationWarning } from '@/src/lib/syllabus-api';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PILOT_COURSE = 'BCS304';
const EXAM_TYPE = 'SEE';

type GenerateError = Error & { paperCraftWarning?: SyllabusGenerationWarning };

function parsePercent(value: string): number {
  const n = Number.parseInt(value.replace(/\D/g, ''), 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function PercentRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.percentRow}>
      <Text style={styles.percentLabel}>{label}</Text>
      <TextInput
        style={styles.percentInput}
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(text) => onChange(parsePercent(text))}
        maxLength={3}
      />
      <Text style={styles.percentSuffix}>%</Text>
    </View>
  );
}

export default function PaperCraftScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { syllabusVersionId } = useLocalSearchParams<{ syllabusVersionId?: string }>();
  const allowed = usePermission(Permission.PaperCraftGenerate);
  const [message, setMessage] = useState<string | null>(null);
  const [trustCardId, setTrustCardId] = useState<string | null>(null);
  const [trustCardOpen, setTrustCardOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [supersededWarning, setSupersededWarning] = useState<SyllabusGenerationWarning | null>(
    null,
  );
  const [difficulty, setDifficulty] = useState<DifficultyProfile>({
    easy: 30,
    moderate: 50,
    hard: 20,
  });
  const [bloom, setBloom] = useState<BloomTargets>({
    l1: 10,
    l2: 25,
    l3: 35,
    l4: 20,
    l5: 10,
  });

  const versionId = typeof syllabusVersionId === 'string' ? syllabusVersionId : undefined;

  const blueprintQuery = useQuery({
    queryKey: ['paper-craft-blueprint', PILOT_COURSE, EXAM_TYPE],
    queryFn: () => fetchBlueprint(PILOT_COURSE, EXAM_TYPE),
    enabled: allowed,
  });

  useEffect(() => {
    if (!blueprintQuery.data) return;
    setDifficulty(blueprintQuery.data.blueprint.difficulty);
    setBloom(blueprintQuery.data.blueprint.bloom);
  }, [blueprintQuery.data]);

  const modulesQuery = useQuery({
    queryKey: ['paper-craft-modules', PILOT_COURSE],
    queryFn: () => fetchPaperCraftModules(PILOT_COURSE),
    enabled: allowed,
  });

  const difficultyTotal = useMemo(() => sumDifficulty(difficulty), [difficulty]);
  const bloomTotal = useMemo(() => sumBloom(bloom), [bloom]);
  const blueprintValid = difficultyTotal === 100 && bloomTotal === 100;

  const saveBlueprintMutation = useMutation({
    mutationFn: () =>
      saveBlueprint(PILOT_COURSE, {
        examType: EXAM_TYPE,
        difficulty,
        bloom,
      }),
    onSuccess: (view) => {
      queryClient.setQueryData(['paper-craft-blueprint', PILOT_COURSE, EXAM_TYPE], view);
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!blueprintValid) {
        throw new Error('Blueprint totals must equal 100%');
      }
      await saveBlueprintMutation.mutateAsync();
      return requestPaperCraftGenerate({
        courseCode: PILOT_COURSE,
        syllabusVersionId: versionId,
        acknowledgeSuperseded: false,
      });
    },
    onSuccess: (payload) => {
      setSupersededWarning(null);
      if (payload.data.paperId) {
        router.push({
          pathname: '/generated-paper',
          params: {
            paperId: payload.data.paperId,
            courseCode: PILOT_COURSE,
          },
        });
        return;
      }
      setMessage(payload.data.message ?? 'Generation completed.');
      setTrustCardId(payload.data.trustCardId ?? payload.data.artifactId ?? null);
    },
    onError: (err: GenerateError) => {
      if (err.paperCraftWarning) {
        setSupersededWarning(err.paperCraftWarning);
        setMessage(null);
        return;
      }
      setMessage(err.message === 'ACCESS_DENIED' ? null : err.message);
    },
  });

  const onProceedDespiteWarning = () => {
    void saveBlueprint(PILOT_COURSE, { examType: EXAM_TYPE, difficulty, bloom })
      .then(() =>
        requestPaperCraftGenerate({
          courseCode: PILOT_COURSE,
          syllabusVersionId: versionId,
          acknowledgeSuperseded: true,
        }),
      )
      .then((payload) => {
        setSupersededWarning(null);
        if (payload.data.paperId) {
          router.push({
            pathname: '/generated-paper',
            params: {
              paperId: payload.data.paperId,
              courseCode: PILOT_COURSE,
            },
          });
          return;
        }
        setMessage(payload.data.message ?? 'Generation completed.');
        setTrustCardId(payload.data.trustCardId ?? payload.data.artifactId ?? null);
      })
      .catch((err: GenerateError) => {
        setMessage(err.message);
      });
  };

  if (!allowed) {
    return <AccessDenied featureName="Paper Craft" />;
  }

  const modules = modulesQuery.data ?? [];
  const pattern = blueprintQuery.data?.patternProfile;
  const canGenerate = blueprintValid && modules.length > 0 && !generate.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Generate question paper</Text>
          <Text style={styles.subtitle}>
            {PILOT_COURSE} · Data Structures · {EXAM_TYPE} · 100 marks
          </Text>

          {versionId ? (
            <Text style={styles.versionHint}>Syllabus version: {versionId.slice(0, 8)}…</Text>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Pattern profile</Text>
              {pattern ? (
                <View style={styles.patternPill}>
                  <Text style={styles.patternPillText}>{pattern.label}</Text>
                </View>
              ) : null}
            </View>
            {blueprintQuery.isLoading ? (
              <ActivityIndicator color={BRAND_PRIMARY} />
            ) : pattern ? (
              <Text style={styles.cardBody}>{pattern.summary}</Text>
            ) : (
              <Text style={styles.cardBody}>Pattern profile unavailable</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Difficulty profile</Text>
            <PercentRow
              label="Easy"
              value={difficulty.easy}
              onChange={(easy) => setDifficulty((d) => ({ ...d, easy }))}
            />
            <PercentRow
              label="Moderate"
              value={difficulty.moderate}
              onChange={(moderate) => setDifficulty((d) => ({ ...d, moderate }))}
            />
            <PercentRow
              label="Hard"
              value={difficulty.hard}
              onChange={(hard) => setDifficulty((d) => ({ ...d, hard }))}
            />
            <Text
              style={[
                styles.totalHint,
                difficultyTotal === 100 ? styles.totalOk : styles.totalBad,
              ]}
            >
              Total: {difficultyTotal}% {difficultyTotal === 100 ? '✓' : '(must equal 100%)'}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Bloom targets</Text>
              <Text style={styles.presetHint}>NBA preset</Text>
            </View>
            {(['l1', 'l2', 'l3', 'l4', 'l5'] as const).map((key, index) => (
              <PercentRow
                key={key}
                label={`L${index + 1}${index === 4 ? '+' : ''}`}
                value={bloom[key]}
                onChange={(value) => setBloom((b) => ({ ...b, [key]: value }))}
              />
            ))}
            <View style={styles.bloomBar}>
              {(['l1', 'l2', 'l3', 'l4', 'l5'] as const).map((key) => (
                <View
                  key={key}
                  style={[
                    styles.bloomSegment,
                    { flex: Math.max(bloom[key], 1) },
                    key === 'l1' && styles.bloomL1,
                    key === 'l2' && styles.bloomL2,
                    key === 'l3' && styles.bloomL3,
                    key === 'l4' && styles.bloomL4,
                    key === 'l5' && styles.bloomL5,
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.totalHint, bloomTotal === 100 ? styles.totalOk : styles.totalBad]}>
              Total: {bloomTotal}% {bloomTotal === 100 ? '✓' : '(must equal 100%)'}
            </Text>
          </View>

          {supersededWarning ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Superseded syllabus</Text>
              <Text style={styles.warningText}>{supersededWarning.message}</Text>
              <Pressable style={styles.warningBtn} onPress={onProceedDespiteWarning}>
                <Text style={styles.warningBtnText}>Proceed anyway →</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Syllabus module picker</Text>
          {modulesQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : modules.length === 0 ? (
            <Text style={styles.emptyHint}>
              No modules yet — define them in Syllabus Vault for {PILOT_COURSE}.
            </Text>
          ) : (
            <View style={styles.moduleGrid}>
              {modules.map((m) => {
                const selected = selectedModuleId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.moduleChip, selected && styles.moduleChipSelected]}
                    onPress={() => setSelectedModuleId(m.id)}
                  >
                    <Text style={[styles.moduleChipTitle, selected && styles.moduleChipTitleSelected]}>
                      M{m.moduleNumber}: {m.title}
                    </Text>
                    <Text style={[styles.moduleChipPages, selected && styles.moduleChipTitleSelected]}>
                      pp. {m.pageStart}–{m.pageEnd}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            style={[styles.btn, !canGenerate && styles.btnDisabled]}
            onPress={() => generate.mutate()}
            disabled={!canGenerate}
          >
            {generate.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>✦ Generate paper</Text>
            )}
          </Pressable>

          {!blueprintValid ? (
            <Text style={styles.blockedHint}>
              Fix difficulty and Bloom totals to 100% each before generating.
            </Text>
          ) : null}

          {message ? <Text style={styles.success}>{message}</Text> : null}

          {trustCardId ? (
            <View style={styles.trustRow}>
              <Text style={styles.trustHint}>AI artifact explainability</Text>
              <TrustCardTrigger onPress={() => setTrustCardOpen(true)} />
            </View>
          ) : null}
        </ScrollView>
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
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  back: { padding: 16 },
  backText: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  body: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 8 },
  versionHint: { fontSize: 11, color: '#666', marginBottom: 12 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECF2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  cardBody: { fontSize: 12, color: '#666', lineHeight: 18 },
  patternPill: {
    backgroundColor: '#E8E4FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  patternPillText: { fontSize: 10, fontWeight: '700', color: '#534AB7' },
  presetHint: { fontSize: 10, color: '#888' },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  percentLabel: { flex: 1, fontSize: 12, color: '#444' },
  percentInput: {
    width: 52,
    borderWidth: 1,
    borderColor: '#D8D8E4',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'right',
    fontSize: 13,
    backgroundColor: '#FAFAFC',
  },
  percentSuffix: { fontSize: 12, color: '#888', width: 16 },
  totalHint: { fontSize: 11, marginTop: 10, fontWeight: '600' },
  totalOk: { color: '#0F6E56' },
  totalBad: { color: '#A32D2D' },
  bloomBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
    gap: 2,
  },
  bloomSegment: { minWidth: 2, borderRadius: 2 },
  bloomL1: { backgroundColor: '#CECBF6' },
  bloomL2: { backgroundColor: '#AFA9EC' },
  bloomL3: { backgroundColor: '#7F77DD' },
  bloomL4: { backgroundColor: '#534AB7' },
  bloomL5: { backgroundColor: '#3C3489' },
  warningBox: {
    backgroundColor: '#FFF4E5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F5A623',
  },
  warningTitle: { fontSize: 12, fontWeight: '800', color: '#7A4E00', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#7A4E00', lineHeight: 18 },
  warningBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#7A4E00',
    borderRadius: 8,
  },
  warningBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 6,
  },
  loader: { marginVertical: 12 },
  emptyHint: { fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 18 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  moduleChip: {
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#C5E8DF',
  },
  moduleChipSelected: {
    backgroundColor: '#085041',
    borderColor: '#085041',
  },
  moduleChipTitle: { fontSize: 12, fontWeight: '700', color: '#085041' },
  moduleChipTitleSelected: { color: '#fff' },
  moduleChipPages: { fontSize: 10, color: '#3d6b5f', marginTop: 2 },
  btn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  blockedHint: { marginTop: 10, fontSize: 12, color: '#A32D2D', lineHeight: 18 },
  success: { marginTop: 16, fontSize: 13, color: '#0F6E56' },
  trustRow: { marginTop: 20, gap: 8 },
  trustHint: { fontSize: 11, color: '#888', fontWeight: '600' },
});
