import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  downloadCsvExport,
  fetchMarksCsvExport,
  type MarksCsvExport,
} from '@/src/lib/marks-api';
import { useMutation } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
  isPublished: boolean;
};

export function MarksCsvExportPanel({ courseCode, examType, isPublished }: Props) {
  const exportMutation = useMutation({
    mutationFn: () => fetchMarksCsvExport(courseCode, examType),
    onSuccess: (exportFile: MarksCsvExport) => {
      downloadCsvExport(exportFile);
    },
  });

  if (!isPublished) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.hint}>Publish marks to Mark Matrix before exporting ERP CSV.</Text>
      </View>
    );
  }

  const errorMessage =
    exportMutation.error instanceof Error ? exportMutation.error.message : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>ERP CSV export</Text>
      <Text style={styles.hint}>
        Download published marks for on-prem ERP upload. File stays local — no cloud transfer.
      </Text>
      {exportMutation.data ? (
        <Text style={styles.success}>
          Exported {exportMutation.data.rowCount} rows · {exportMutation.data.fileName}
        </Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable
        style={[styles.btn, exportMutation.isPending && styles.btnDisabled]}
        onPress={() => exportMutation.mutate()}
        disabled={exportMutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Export published marks CSV"
      >
        {exportMutation.isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.btnText}>Download ERP CSV</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 8,
  },
  title: { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  hint: { fontSize: 11, color: '#666', lineHeight: 16 },
  success: { fontSize: 11, color: '#0F6E56', lineHeight: 16 },
  error: { fontSize: 11, color: '#A32D2D' },
  btn: {
    borderRadius: 8,
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  btnDisabled: { opacity: 0.6 },
});
