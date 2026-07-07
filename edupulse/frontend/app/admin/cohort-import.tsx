import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchCohortSample,
  fetchCohortTemplate,
  importCohortCsv,
  type ImportSummary,
} from '@/src/lib/cohort-api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

export default function CohortImportScreen() {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<ImportSummary | null>(null);

  const { data: template } = useQuery({
    queryKey: ['cohort-template'],
    queryFn: fetchCohortTemplate,
  });

  const importMutation = useMutation({
    mutationFn: importCohortCsv,
    onSuccess: setResult,
  });

  const onLoadSample = useCallback(async () => {
    const sample = await fetchCohortSample();
    setCsv(sample);
    setResult(null);
  }, []);

  const onImport = useCallback(() => {
    if (!csv.trim()) return;
    importMutation.mutate(csv);
  }, [csv, importMutation]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Import pilot cohort</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.hint}>
            Upload CSV for PES CSE — columns: USN, Student Name, Course Code, Section, Semester.
            Imports are idempotent by USN + course code.
          </Text>

          {template ? (
            <Text style={styles.templateLabel}>Template header: {template.split('\n')[0]}</Text>
          ) : null}

          <TextInput
            style={styles.textarea}
            multiline
            value={csv}
            onChangeText={setCsv}
            placeholder="Paste CSV rows here…"
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Pressable style={styles.outlineBtn} onPress={() => void onLoadSample()}>
              <Text style={styles.outlineBtnText}>Load BCS304 sample (64)</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryBtn, importMutation.isPending && styles.btnDisabled]}
              onPress={onImport}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Import cohort</Text>
              )}
            </Pressable>
          </View>

          {result ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>Import summary</Text>
              <Text style={styles.resultLine}>
                Processed {result.rowsProcessed} rows · created {result.studentsCreated} students,{' '}
                updated {result.studentsUpdated} · enrollments +{result.enrollmentsCreated} / ~
                {result.enrollmentsUpdated}
              </Text>
              {result.errors.length > 0 ? (
                <View style={styles.errors}>
                  <Text style={styles.errorTitle}>Row errors ({result.errors.length})</Text>
                  {result.errors.slice(0, 5).map((err) => (
                    <Text key={`${err.row}-${err.message}`} style={styles.errorLine}>
                      Row {err.row}: {err.message}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#FFF' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    gap: 8,
  },
  back: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  content: { padding: 16, paddingBottom: 32 },
  hint: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 12 },
  templateLabel: { fontSize: 10, color: '#888', marginBottom: 8, fontFamily: 'monospace' },
  textarea: {
    minHeight: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
    borderRadius: 10,
    padding: 12,
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: '#F7F7FA',
    marginBottom: 12,
  },
  actions: { gap: 10, marginBottom: 16 },
  primaryBtn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineBtnText: { color: BRAND_PRIMARY, fontWeight: '600', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  resultBox: {
    backgroundColor: '#F7F7FA',
    borderRadius: 10,
    padding: 12,
  },
  resultTitle: { fontWeight: '700', fontSize: 13, marginBottom: 6 },
  resultLine: { fontSize: 12, color: '#444', lineHeight: 18 },
  errors: { marginTop: 10 },
  errorTitle: { fontSize: 11, fontWeight: '700', color: '#B3261E', marginBottom: 4 },
  errorLine: { fontSize: 11, color: '#B3261E', marginBottom: 2 },
});
