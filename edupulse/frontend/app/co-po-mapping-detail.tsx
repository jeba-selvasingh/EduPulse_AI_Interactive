import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchPaperCoPoMapping,
  updateQuestionCoPoMapping,
  type StrengthWeight,
} from '@/src/lib/co-po-mapping-api';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CO_OPTIONS = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'] as const;
const PO_OPTIONS = ['PO2', 'PO3', 'PO4', 'PO5', 'PO6'] as const;
const STRENGTH_OPTIONS: StrengthWeight[] = [1, 2, 3];

export default function CoPoMappingDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paperId, questionId, courseCode } = useLocalSearchParams<{
    paperId?: string;
    questionId?: string;
    courseCode?: string;
  }>();
  const allowed = usePermission(Permission.PaperCraftGenerate);

  const mappingQuery = useQuery({
    queryKey: ['paper-co-po-mapping', paperId],
    queryFn: () => fetchPaperCoPoMapping(paperId!),
    enabled: Boolean(paperId) && allowed,
  });

  const entry = useMemo(
    () => mappingQuery.data?.questions.find((question) => question.questionId === questionId),
    [mappingQuery.data?.questions, questionId],
  );

  const [draftCo, setDraftCo] = useState<string | null>(null);
  const [draftPo, setDraftPo] = useState<string | null>(null);
  const [draftStrength, setDraftStrength] = useState<StrengthWeight | null>(null);

  const selectedCo = draftCo ?? entry?.coTag ?? 'CO1';
  const selectedPo = draftPo ?? entry?.poTag ?? 'PO2';
  const selectedStrength = draftStrength ?? entry?.strengthWeight ?? 2;

  const save = useMutation({
    mutationFn: () =>
      updateQuestionCoPoMapping(paperId!, questionId!, {
        coTag: selectedCo,
        poTag: selectedPo,
        strengthWeight: selectedStrength,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(['paper-co-po-mapping', paperId], (prev: typeof mappingQuery.data) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((question) =>
                question.questionId === questionId ? result.mapping : question,
              ),
              coverage: result.coverage,
              underRepresentedCount: result.coverage.filter((item) => item.isUnderRepresented)
                .length,
              readyForSubmit: result.readyForSubmit,
            }
          : prev,
      );
      setDraftCo(null);
      setDraftPo(null);
      setDraftStrength(null);
      router.back();
    },
  });

  if (!allowed) {
    return <AccessDenied featureName="CO/PO Mapping" />;
  }

  if (!paperId || !questionId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Missing paper or question ID.</Text>
      </SafeAreaView>
    );
  }

  const displayCourse = courseCode ?? mappingQuery.data?.courseCode ?? 'BCS304';
  const hasChanges = Boolean(
    entry &&
      (selectedCo !== entry.coTag ||
        selectedPo !== entry.poTag ||
        selectedStrength !== entry.strengthWeight),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Adjust mapping · {displayCourse}</Text>

          {mappingQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : entry ? (
            <>
              <Text style={styles.questionKey}>{entry.questionKey}</Text>
              <Text style={styles.rationale}>{entry.rationale}</Text>

              <Text style={styles.fieldLabel}>Course outcome (CO)</Text>
              <View style={styles.optionRow}>
                {CO_OPTIONS.map((co) => (
                  <Pressable
                    key={co}
                    style={[styles.optionPill, selectedCo === co && styles.optionPillActive]}
                    onPress={() => setDraftCo(co)}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        selectedCo === co && styles.optionPillTextActive,
                      ]}
                    >
                      {co}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Program outcome (PO)</Text>
              <View style={styles.optionRow}>
                {PO_OPTIONS.map((po) => (
                  <Pressable
                    key={po}
                    style={[styles.optionPill, selectedPo === po && styles.optionPillActive]}
                    onPress={() => setDraftPo(po)}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        selectedPo === po && styles.optionPillTextActive,
                      ]}
                    >
                      {po}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Strength weight (1–3)</Text>
              <View style={styles.optionRow}>
                {STRENGTH_OPTIONS.map((weight) => (
                  <Pressable
                    key={weight}
                    style={[
                      styles.strengthBtn,
                      selectedStrength === weight && styles.strengthBtnActive,
                    ]}
                    onPress={() => setDraftStrength(weight)}
                  >
                    <Text
                      style={[
                        styles.strengthBtnText,
                        selectedStrength === weight && styles.strengthBtnTextActive,
                      ]}
                    >
                      {weight}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>
                Higher strength increases weighted CO coverage (3 = strong direct assessment).
              </Text>

              <Pressable
                style={[styles.saveBtn, (!hasChanges || save.isPending) && styles.saveBtnDisabled]}
                onPress={() => save.mutate()}
                disabled={!hasChanges || save.isPending}
              >
                {save.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save mapping</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Text style={styles.error}>Question mapping not found.</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  back: { padding: 16 },
  backText: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  body: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  questionKey: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  rationale: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 16 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 8,
    marginTop: 8,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0EA',
  },
  optionPillActive: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  optionPillText: { fontSize: 12, fontWeight: '600', color: '#444' },
  optionPillTextActive: { color: '#FFF' },
  strengthBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0EA',
  },
  strengthBtnActive: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  strengthBtnText: { fontSize: 16, fontWeight: '700', color: '#444' },
  strengthBtnTextActive: { color: '#FFF' },
  hint: { fontSize: 10, color: '#888', marginTop: 8, marginBottom: 20, lineHeight: 15 },
  saveBtn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  loader: { marginVertical: 24 },
  error: { fontSize: 13, color: '#A32D2D', padding: 16 },
});
