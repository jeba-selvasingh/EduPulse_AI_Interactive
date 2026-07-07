import { AccessDenied } from '@/src/components/AccessDenied';
import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { TrustCardTrigger } from '@/src/components/TrustCardTrigger';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { fetchGeneratedPaper, regeneratePaperQuestion } from '@/src/lib/features-api';
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

export default function GeneratedPaperScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paperId, courseCode } = useLocalSearchParams<{
    paperId?: string;
    courseCode?: string;
  }>();
  const allowed = usePermission(Permission.PaperCraftGenerate);
  const [trustCardOpen, setTrustCardOpen] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const paperQuery = useQuery({
    queryKey: ['generated-paper', paperId],
    queryFn: () => fetchGeneratedPaper(paperId!),
    enabled: Boolean(paperId) && allowed,
  });

  const regenerate = useMutation({
    mutationFn: (questionId: string) => regeneratePaperQuestion(paperId!, questionId),
    onMutate: (questionId) => {
      setRegeneratingId(questionId);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['generated-paper', paperId], (prev: typeof paperQuery.data) =>
        prev
          ? {
              ...prev,
              questions: result.data.questions,
            }
          : prev,
      );
    },
    onSettled: () => {
      setRegeneratingId(null);
    },
  });

  const bloomDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const question of paperQuery.data?.questions ?? []) {
      const index = question.bloomLevel - 1;
      if (index >= 0 && index < 5) counts[index]! += 1;
    }
    return counts;
  }, [paperQuery.data?.questions]);

  const flaggedCount = useMemo(
    () => (paperQuery.data?.questions ?? []).filter((q) => q.similarityWarning).length,
    [paperQuery.data?.questions],
  );

  if (!allowed) {
    return <AccessDenied featureName="Paper Craft" />;
  }

  if (!paperId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.phoneShell}>
          <Text style={styles.error}>No paper ID provided.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>‹ Back to Paper Craft</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const paper = paperQuery.data;
  const displayCourse = courseCode ?? paper?.courseCode ?? 'BCS304';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {displayCourse} · {paper?.examType ?? 'SEE'} Paper
            </Text>
            <View style={styles.blueprintPill}>
              <Text style={styles.blueprintPillText}>Blueprint ✓</Text>
            </View>
          </View>

          {paperQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : paperQuery.isError ? (
            <Text style={styles.error}>Could not load generated paper.</Text>
          ) : paper ? (
            <>
              <Text style={styles.meta}>
                {paper.questionCount} questions · {paper.totalMarks} marks · generated in{' '}
                {paper.durationMs}ms
                {flaggedCount > 0 ? ` · ${flaggedCount} similarity flag(s)` : ''}
              </Text>

              <Text style={styles.sectionLabel}>GENERATED QUESTIONS</Text>

              {paper.questions.map((question) => {
                const flagged = Boolean(question.similarityWarning);
                const isRegenerating = regeneratingId === question.id;

                return (
                  <View
                    key={question.id}
                    style={[styles.card, flagged && styles.cardFlagged]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.questionKey}>
                        {question.questionKey} · Module {question.moduleNumber} · {question.marks}m
                      </Text>
                      {flagged ? (
                        <View style={styles.matchPill}>
                          <Text style={styles.matchPillText}>
                            {question.similarityWarning!.similarityPct}% match
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.bloomPill}>
                          <Text style={styles.bloomPillText}>L{question.bloomLevel}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.questionText}>{question.text}</Text>

                    {flagged ? (
                      <Text style={styles.similarityHint}>
                        ⚠ Similar to {question.similarityWarning!.matchedReference} — regenerate
                        to replace this question only
                      </Text>
                    ) : null}

                    <View style={styles.tagRow}>
                      <View style={styles.coPoPill}>
                        <Text style={styles.coPoText}>
                          {question.coTag} → {question.poTag}
                        </Text>
                      </View>
                      <Pressable onPress={() => setTrustCardOpen(true)}>
                        <View style={styles.trustPill}>
                          <Text style={styles.trustPillText}>✓ Trust card ›</Text>
                        </View>
                      </Pressable>
                    </View>

                    {flagged ? (
                      <Pressable
                        style={[styles.regenBtn, isRegenerating && styles.regenBtnDisabled]}
                        onPress={() => regenerate.mutate(question.id)}
                        disabled={isRegenerating || regenerate.isPending}
                      >
                        {isRegenerating ? (
                          <ActivityIndicator color="#A32D2D" size="small" />
                        ) : (
                          <Text style={styles.regenBtnText}>↻ Regenerate this question</Text>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Bloom distribution (generated)</Text>
                <View style={styles.bloomBar}>
                  {bloomDistribution.map((count, index) => (
                    <View
                      key={index}
                      style={[
                        styles.bloomSegment,
                        { flex: Math.max(count, 1) },
                        index === 0 && styles.bloomL1,
                        index === 1 && styles.bloomL2,
                        index === 2 && styles.bloomL3,
                        index === 3 && styles.bloomL4,
                        index === 4 && styles.bloomL5,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.bloomHint}>
                  L1–L5 counts: {bloomDistribution.join(' / ')}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/answer-key',
                      params: { paperId, courseCode: displayCourse },
                    })
                  }
                >
                  <Text style={styles.secondaryBtnText}>Answer key →</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/co-po-mapping',
                      params: { paperId, courseCode: displayCourse },
                    })
                  }
                >
                  <Text style={styles.secondaryBtnText}>CO/PO map →</Text>
                </Pressable>
              </View>

              <View style={styles.trustRow}>
                <Text style={styles.trustHint}>Paper-level Trust Card</Text>
                <TrustCardTrigger onPress={() => setTrustCardOpen(true)} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>

      <TrustCardSlideOver
        artifactId={paper?.trustCardId ?? null}
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
  backLink: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600', padding: 16 },
  body: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  blueprintPill: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  blueprintPillText: { fontSize: 10, fontWeight: '700', color: '#085041' },
  meta: { fontSize: 11, color: '#888', marginBottom: 12 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  loader: { marginVertical: 24 },
  error: { fontSize: 13, color: '#A32D2D', padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECF2',
  },
  cardFlagged: {
    borderColor: '#F5C2C2',
    backgroundColor: '#FFF8F8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  questionKey: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  bloomPill: {
    backgroundColor: '#E8E4FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bloomPillText: { fontSize: 10, fontWeight: '700', color: '#534AB7' },
  matchPill: {
    backgroundColor: '#FDE8E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  matchPillText: { fontSize: 10, fontWeight: '700', color: '#A32D2D' },
  questionText: { fontSize: 12, color: '#444', lineHeight: 18, marginBottom: 8 },
  similarityHint: {
    fontSize: 10,
    color: '#A32D2D',
    lineHeight: 16,
    marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  coPoPill: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coPoText: { fontSize: 10, fontWeight: '700', color: '#085041' },
  trustPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  trustPillText: { fontSize: 10, fontWeight: '700', color: '#0F6E56' },
  regenBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8A0A0',
    backgroundColor: '#FFF',
    minHeight: 36,
    justifyContent: 'center',
  },
  regenBtnDisabled: { opacity: 0.6 },
  regenBtnText: { fontSize: 11, fontWeight: '700', color: '#A32D2D' },
  bloomBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
    gap: 2,
  },
  bloomSegment: { minWidth: 2, borderRadius: 2 },
  bloomL1: { backgroundColor: '#CECBF6' },
  bloomL2: { backgroundColor: '#AFA9EC' },
  bloomL3: { backgroundColor: '#7F77DD' },
  bloomL4: { backgroundColor: '#534AB7' },
  bloomL5: { backgroundColor: '#3C3489' },
  bloomHint: { fontSize: 10, color: '#666', marginTop: 8 },
  trustRow: { marginTop: 12, gap: 8 },
  trustHint: { fontSize: 11, color: '#888', fontWeight: '600' },
  actionsRow: { marginTop: 8, marginBottom: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C5C5D8',
    backgroundColor: '#FFF',
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
});
