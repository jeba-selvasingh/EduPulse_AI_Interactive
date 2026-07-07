import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchMarksImportSample,
  importMarksFile,
  type MarksImportSummary,
} from '@/src/lib/marks-api';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
  onImported: (summary: MarksImportSummary) => void;
  onClose: () => void;
};

export function MarksExcelImportPanel({ courseCode, examType, onImported, onClose }: Props) {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<MarksImportSummary | null>(null);

  const importMutation = useMutation({
    mutationFn: (payload: { csv: string }) => importMarksFile(courseCode, examType, payload),
    onSuccess: (summary) => {
      setResult(summary);
      onImported(summary);
    },
  });

  const onLoadSample = useCallback(async () => {
    const sample = await fetchMarksImportSample(courseCode, examType);
    setCsv(sample.csv);
    setResult(null);
  }, [courseCode, examType]);

  const onImport = useCallback(() => {
    if (!csv.trim()) return;
    importMutation.mutate({ csv });
  }, [csv, importMutation]);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHdr}>
        <Text style={styles.panelTitle}>Excel import</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close import panel">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Paste CSV exported from the Excel template (USN, Student Name, Q1, Q2, Q3). Invalid rows and
        USN mismatches are reported with line numbers.
      </Text>

      <TextInput
        style={styles.textarea}
        multiline
        value={csv}
        onChangeText={setCsv}
        placeholder="USN,Student Name,Q1,Q2,Q3"
        textAlignVertical="top"
        accessibilityLabel="Marks import CSV content"
      />

      <View style={styles.actions}>
        <Pressable style={styles.outlineBtn} onPress={() => void onLoadSample()}>
          <Text style={styles.outlineBtnText}>Load sample (5 rows)</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryBtn, importMutation.isPending && styles.btnDisabled]}
          onPress={onImport}
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Import marks</Text>
          )}
        </Pressable>
      </View>

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Import summary</Text>
          <Text style={styles.resultLine}>
            {result.rowsImported}/{result.rowsProcessed} rows imported · {result.cellsImported} cells
            saved
          </Text>

          {result.usnMismatches.length > 0 ? (
            <View style={styles.errors}>
              <Text style={styles.warnTitle}>USN mismatches ({result.usnMismatches.length})</Text>
              {result.usnMismatches.slice(0, 5).map((item) => (
                <Text key={`${item.row}-${item.usn}`} style={styles.warnLine}>
                  Row {item.row}: {item.usn} — {item.message}
                </Text>
              ))}
            </View>
          ) : null}

          {result.errors.length > 0 ? (
            <View style={styles.errors}>
              <Text style={styles.errorTitle}>Row errors ({result.errors.length})</Text>
              {result.errors.slice(0, 5).map((err) => (
                <Text key={`${err.row}-${err.column ?? ''}-${err.message}`} style={styles.errorLine}>
                  Row {err.row}
                  {err.column ? ` · ${err.column}` : ''}: {err.message}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
    padding: 12,
    maxHeight: 320,
  },
  panelHdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  panelTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  close: { fontSize: 16, color: '#718096', padding: 4 },
  hint: { fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 },
  textarea: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#F7F7FA',
    marginBottom: 8,
  },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: BRAND_PRIMARY, fontWeight: '600', fontSize: 11 },
  btnDisabled: { opacity: 0.5 },
  resultBox: { backgroundColor: '#F7F7FA', borderRadius: 8, padding: 10 },
  resultTitle: { fontWeight: '700', fontSize: 12, marginBottom: 4 },
  resultLine: { fontSize: 11, color: '#444', lineHeight: 16 },
  errors: { marginTop: 8 },
  errorTitle: { fontSize: 10, fontWeight: '700', color: '#B3261E', marginBottom: 2 },
  errorLine: { fontSize: 10, color: '#B3261E', marginBottom: 2 },
  warnTitle: { fontSize: 10, fontWeight: '700', color: '#B7791F', marginBottom: 2 },
  warnLine: { fontSize: 10, color: '#B7791F', marginBottom: 2 },
});
