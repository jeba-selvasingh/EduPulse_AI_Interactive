import { AccessDenied } from '@/src/components/AccessDenied';
import { TrustCardSlideOver } from '@/src/components/TrustCardSlideOver';
import { TrustCardTrigger } from '@/src/components/TrustCardTrigger';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchQuestionAnswerKey,
  updateQuestionModelAnswer,
} from '@/src/lib/answer-key-api';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function AnswerKeyDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paperId, questionId, courseCode } = useLocalSearchParams<{
    paperId?: string;
    questionId?: string;
    courseCode?: string;
  }>();
  const allowed = usePermission(Permission.PaperCraftGenerate);
  const [trustCardOpen, setTrustCardOpen] = useState(false);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['question-answer-key', paperId, questionId],
    queryFn: () => fetchQuestionAnswerKey(paperId!, questionId!),
    enabled: Boolean(paperId && questionId) && allowed,
  });

  useEffect(() => {
    if (detailQuery.data?.modelAnswer) {
      setDraftAnswer(detailQuery.data.modelAnswer);
    }
  }, [detailQuery.data?.modelAnswer]);

  const saveEdit = useMutation({
    mutationFn: () => updateQuestionModelAnswer(paperId!, questionId!, draftAnswer),
    onSuccess: (updated) => {
      queryClient.setQueryData(['question-answer-key', paperId, questionId], updated);
      queryClient.invalidateQueries({ queryKey: ['paper-answer-key', paperId] });
      setIsEditing(false);
    },
  });

  if (!allowed) {
    return <AccessDenied featureName="Answer Key" />;
  }

  if (!paperId || !questionId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Missing paper or question ID.</Text>
      </SafeAreaView>
    );
  }

  const entry = detailQuery.data;
  const displayCourse = courseCode ?? 'BCS304';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              Answer key · {entry?.questionKey ?? '…'} · {displayCourse}
            </Text>
            {entry ? (
              <View style={styles.marksPill}>
                <Text style={styles.marksPillText}>{entry.maxMarks} marks</Text>
              </View>
            ) : null}
          </View>

          {detailQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : entry ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Mark-step allocation</Text>
                {entry.rubricSteps.map((step, index) => (
                  <View key={index} style={styles.stepRow}>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Text style={styles.stepMarks}>{step.marks} m</Text>
                  </View>
                ))}
                <Text
                  style={[
                    styles.totalHint,
                    entry.rubricTotal === entry.maxMarks ? styles.totalOk : styles.totalBad,
                  ]}
                >
                  Rubric total: {entry.rubricTotal}/{entry.maxMarks} marks
                </Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Model answer</Text>
                  <Pressable onPress={() => setIsEditing((value) => !value)}>
                    <Text style={styles.editLink}>{isEditing ? 'Cancel' : '✎ Edit'}</Text>
                  </Pressable>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.answerInput}
                    multiline
                    value={draftAnswer}
                    onChangeText={setDraftAnswer}
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={styles.answerText}>{entry.modelAnswer}</Text>
                )}
              </View>

              {isEditing ? (
                <Pressable
                  style={[styles.btn, saveEdit.isPending && styles.btnDisabled]}
                  onPress={() => saveEdit.mutate()}
                  disabled={saveEdit.isPending || draftAnswer.trim().length === 0}
                >
                  {saveEdit.isPending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnText}>Save model answer</Text>
                  )}
                </Pressable>
              ) : null}

              <View style={styles.trustRow}>
                <Text style={styles.trustHint}>Answer key Trust Card</Text>
                <TrustCardTrigger onPress={() => setTrustCardOpen(true)} />
              </View>
            </>
          ) : (
            <Text style={styles.error}>Could not load answer key for this question.</Text>
          )}
        </ScrollView>
      </View>

      <TrustCardSlideOver
        artifactId={entry?.trustCardId ?? null}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  marksPill: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marksPillText: { fontSize: 10, fontWeight: '700', color: '#085041' },
  loader: { marginVertical: 24 },
  error: { fontSize: 13, color: '#A32D2D' },
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
    marginBottom: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  stepLabel: { flex: 1, fontSize: 12, color: '#444' },
  stepMarks: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  totalHint: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  totalOk: { color: '#0F6E56' },
  totalBad: { color: '#A32D2D' },
  editLink: { fontSize: 11, fontWeight: '700', color: BRAND_PRIMARY },
  answerText: { fontSize: 12, color: '#444', lineHeight: 18 },
  answerInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#D8D8E4',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#333',
    backgroundColor: '#FAFAFC',
  },
  btn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  trustRow: { marginTop: 8, gap: 8 },
  trustHint: { fontSize: 11, color: '#888', fontWeight: '600' },
});
