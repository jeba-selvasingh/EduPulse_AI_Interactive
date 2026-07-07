import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  fetchBulkUploadSample,
  uploadBulkSheets,
  type BulkUploadSummary,
} from '@/src/lib/evaluation-api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  courseCode: string;
  examType: string;
  paperId?: string;
  onUploaded?: (summary: BulkUploadSummary) => void;
};

export function BulkUploadPanel({ courseCode, examType, paperId, onUploaded }: Props) {
  const [summary, setSummary] = useState<BulkUploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQuery = useQuery({
    queryKey: ['bulk-upload-sample', courseCode, examType],
    queryFn: () => fetchBulkUploadSample(courseCode, examType),
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      uploadBulkSheets(
        courseCode,
        examType,
        {
          fileName: sampleQuery.data?.fileName ?? `${courseCode}-sheets.zip`,
          entries: (sampleQuery.data?.entries ?? []).map((entry) => ({
            fileName: entry.fileName,
            estimatedDpi: entry.estimatedDpi,
          })),
        },
        paperId,
      ),
    onSuccess: (result) => {
      setSummary(result);
      setError(null);
      onUploaded?.(result);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSummary(null);
    },
  });

  const oversizeMutation = useMutation({
    mutationFn: () =>
      uploadBulkSheets(
        courseCode,
        examType,
        {
          fileName: 'oversized-batch.zip',
          byteLength: 201 * 1024 * 1024,
          entries: [],
        },
        paperId,
      ),
    onError: (err: Error) => setError(err.message),
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Bulk PDF / ZIP upload</Text>
        <Text style={styles.infoBody}>
          {sampleQuery.data?.instructions ??
            'Name each scanned PDF by USN before zipping. Maximum batch size is 200 MB.'}
        </Text>
      </View>

      {sampleQuery.data ? (
        <View style={styles.sampleCard}>
          <Text style={styles.sampleTitle}>Pilot sample batch</Text>
          {sampleQuery.data.entries.map((entry) => (
            <Text key={entry.fileName} style={styles.sampleRow}>
              {entry.fileName} · {entry.studentName}
              {entry.estimatedDpi < 200 ? ' · low DPI' : ''}
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable
        style={[styles.primaryBtn, uploadMutation.isPending && styles.btnDisabled]}
        onPress={() => uploadMutation.mutate()}
        disabled={uploadMutation.isPending || !sampleQuery.data}
        accessibilityRole="button"
      >
        {uploadMutation.isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Upload sample ZIP batch</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => oversizeMutation.mutate()}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryBtnText}>Test 200 MB limit rejection</Text>
      </Pressable>

      {error ? (
        <View style={styles.errorCard} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            {summary.acceptedCount} sheets accepted · {summary.uploadedTotal} total uploaded
          </Text>
          {summary.mapped.map((file) => (
            <Text key={file.fileName} style={styles.mappedRow}>
              {file.usn} → {file.studentName}
            </Text>
          ))}
          {summary.qualityWarnings.map((warning) => (
            <Text key={warning.fileName} style={styles.warnRow}>
              ⚠ {warning.fileName}: {warning.message}
            </Text>
          ))}
          {summary.usnMismatches.map((mismatch) => (
            <Text key={mismatch.fileName} style={styles.rejectRow}>
              ✗ {mismatch.fileName}: {mismatch.message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  infoCard: {
    backgroundColor: '#EEEDFE',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4D0F5',
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#3C3489', marginBottom: 4 },
  infoBody: { fontSize: 11, color: '#666', lineHeight: 16 },
  sampleCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sampleTitle: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 6 },
  sampleRow: { fontSize: 11, color: '#444', marginBottom: 4 },
  primaryBtn: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    backgroundColor: '#FFF',
  },
  secondaryBtnText: { fontSize: 11, fontWeight: '600', color: '#666' },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 11, color: '#A32D2D', lineHeight: 16 },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultTitle: { fontSize: 12, fontWeight: '700', color: '#0F6E56', marginBottom: 8 },
  mappedRow: { fontSize: 11, color: '#444', marginBottom: 3 },
  warnRow: { fontSize: 10, color: '#8A5A00', marginTop: 4, lineHeight: 14 },
  rejectRow: { fontSize: 10, color: '#A32D2D', marginTop: 4, lineHeight: 14 },
});
