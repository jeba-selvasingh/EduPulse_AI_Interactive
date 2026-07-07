import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchPaperAnswerKey,
  generatePaperAnswerKey,
  type PaperAnswerKey,
} from '@/src/lib/answer-key-api';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnswerKeyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paperId, courseCode } = useLocalSearchParams<{
    paperId?: string;
    courseCode?: string;
  }>();
  const allowed = usePermission(Permission.PaperCraftGenerate);

  const answerKeyQuery = useQuery({
    queryKey: ['paper-answer-key', paperId],
    queryFn: () => fetchPaperAnswerKey(paperId!),
    enabled: Boolean(paperId) && allowed,
    retry: (count, error) => error.message !== 'NOT_FOUND' && count < 1,
  });

  const generate = useMutation({
    mutationFn: () => generatePaperAnswerKey(paperId!),
    onSuccess: (data) => {
      queryClient.setQueryData(['paper-answer-key', paperId], data);
    },
  });

  if (!allowed) {
    return <AccessDenied featureName="Answer Key" />;
  }

  if (!paperId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>No paper ID provided.</Text>
      </SafeAreaView>
    );
  }

  const answerKey = answerKeyQuery.data;
  const displayCourse = courseCode ?? answerKey?.courseCode ?? 'BCS304';
  const needsGenerate = answerKeyQuery.isError && answerKeyQuery.error?.message === 'NOT_FOUND';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Answer key · {displayCourse}</Text>
          <Text style={styles.subtitle}>
            Model answers and mark-step rubrics for moderation and Answer Sheet AI
          </Text>

          {answerKeyQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : needsGenerate ? (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                Generate AI model answers and rubrics for all questions on this paper.
              </Text>
              <Pressable
                style={[styles.btn, generate.isPending && styles.btnDisabled]}
                onPress={() => generate.mutate()}
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>✦ Generate answer key</Text>
                )}
              </Pressable>
            </View>
          ) : answerKey ? (
            <>
              <Text style={styles.meta}>
                {answerKey.questions.length} questions · generated{' '}
                {new Date(answerKey.generatedAt).toLocaleString()}
              </Text>

              {answerKey.questions.map((entry) => (
                <Pressable
                  key={entry.questionId}
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/answer-key-detail',
                      params: {
                        paperId,
                        questionId: entry.questionId,
                        courseCode: displayCourse,
                      },
                    })
                  }
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.questionKey}>{entry.questionKey}</Text>
                    <View style={styles.marksPill}>
                      <Text style={styles.marksPillText}>{entry.maxMarks} marks</Text>
                    </View>
                  </View>
                  <Text style={styles.preview} numberOfLines={2}>
                    {entry.modelAnswer}
                  </Text>
                  <Text style={styles.rubricHint}>
                    {entry.rubricSteps.length} rubric steps · total {entry.rubricTotal}m{' '}
                    {entry.isValid ? '✓' : '⚠'}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : (
            <Text style={styles.error}>Could not load answer key.</Text>
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
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  meta: { fontSize: 11, color: '#888', marginBottom: 12 },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardBody: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 12 },
  questionKey: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  marksPill: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  marksPillText: { fontSize: 10, fontWeight: '700', color: '#085041' },
  preview: { fontSize: 12, color: '#555', lineHeight: 18 },
  rubricHint: { fontSize: 10, color: '#888', marginTop: 8 },
  btn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
