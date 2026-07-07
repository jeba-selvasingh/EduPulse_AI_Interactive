import {
  downloadBatchReadinessExport,
  exportBatchReadinessReport,
  fetchBatchReadinessReport,
  reportGapSeverityStyle,
  type BatchReadinessExportFormat,
  type BatchReadinessReportView,
  type ReportDepartmentRow,
  type ReportGapRow,
  type ReportTierRow,
} from '@/src/lib/campus-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function TierBar({ tier }: { tier: ReportTierRow }) {
  return (
    <View style={styles.tierBarRow}>
      <View style={styles.row}>
        <Text style={styles.tierBarLabel}>{tier.label}</Text>
        <Text style={[styles.tierBarCount, { color: tier.color }]}>
          {tier.count} · {tier.percent}%
        </Text>
      </View>
      <View style={styles.tierTrack}>
        <View
          style={[styles.tierFill, { width: `${tier.barPercent}%`, backgroundColor: tier.color }]}
        />
      </View>
    </View>
  );
}

function GapRow({ gap }: { gap: ReportGapRow }) {
  const tone = reportGapSeverityStyle(gap.severity);

  return (
    <View style={styles.gapRow}>
      <Text style={styles.gapLabel}>{gap.label}</Text>
      <View style={[styles.pill, { backgroundColor: tone.backgroundColor }]}>
        <Text style={[styles.pillText, { color: tone.color }]}>{gap.countLabel}</Text>
      </View>
    </View>
  );
}

function DepartmentRow({ dept }: { dept: ReportDepartmentRow }) {
  return (
    <View style={styles.deptRow}>
      <View style={styles.row}>
        <Text style={styles.deptLabel}>{dept.department}</Text>
        <Text style={[styles.deptPercent, { color: dept.color }]}>{dept.readinessPercent}%</Text>
      </View>
      <View style={styles.tierTrack}>
        <View
          style={[styles.tierFill, { width: `${dept.barPercent}%`, backgroundColor: dept.color }]}
        />
      </View>
    </View>
  );
}

function ReportContent({ report }: { report: BatchReadinessReportView }) {
  const router = useRouter();
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: (format: BatchReadinessExportFormat) => exportBatchReadinessReport(format),
    onSuccess: (file) => {
      downloadBatchReadinessExport(file);
      setLastExport(`${file.fileName} · ${file.format.toUpperCase()}`);
      setExportError(null);
    },
    onError: (error) => {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    },
  });

  const forecast = report.recoveryForecast;

  return (
    <View>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Batch readiness report</Text>
        <Text style={styles.heroSubtitle}>
          {report.reportTitle} · {report.batchStrength} students
        </Text>
        <Text style={styles.heroMeta}>Generated {report.generatedAt.slice(0, 10)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Readiness tier distribution</Text>
      <View style={styles.card}>
        {report.tierDistribution.map((tier) => (
          <TierBar key={tier.tier} tier={tier} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Top gaps across batch</Text>
      <View style={styles.card}>
        {report.topGaps.map((gap) => (
          <GapRow key={gap.id} gap={gap} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Dept-wise readiness</Text>
      <View style={styles.card}>
        {report.departmentReadiness.map((dept) => (
          <DepartmentRow key={dept.department} dept={dept} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recovery forecast</Text>
      <View style={styles.card}>
        <Text style={styles.forecastSummary}>{forecast.summary}</Text>
        <View style={styles.forecastStats}>
          <View style={styles.forecastStat}>
            <Text style={styles.forecastLabel}>Current placement</Text>
            <Text style={styles.forecastValue}>{forecast.currentPlacementPercent}%</Text>
          </View>
          <View style={styles.forecastStat}>
            <Text style={styles.forecastLabel}>Projected</Text>
            <Text style={[styles.forecastValue, styles.forecastGreen]}>
              {forecast.projectedPlacementPercent}%
            </Text>
          </View>
          <View style={styles.forecastStat}>
            <Text style={styles.forecastLabel}>At-risk → Core</Text>
            <Text style={styles.forecastValue}>{forecast.atRiskToCoreCount}</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={styles.linkCard}
        onPress={() => router.push(report.interventionPriorityRoute as never)}
      >
        <Text style={styles.linkTitle}>View intervention priority list →</Text>
        <Text style={styles.linkSubtitle}>Students ranked by recovery impact</Text>
      </Pressable>

      <View style={styles.exportCard}>
        <Text style={styles.sectionTitle}>Export report</Text>
        <Text style={styles.exportHint}>Download PDF for leadership review or Excel for analysis.</Text>
        {lastExport ? <Text style={styles.exportSuccess}>Exported {lastExport}</Text> : null}
        {exportError ? <Text style={styles.exportError}>{exportError}</Text> : null}
        <View style={styles.exportRow}>
          <Pressable
            style={[styles.exportBtn, exportMutation.isPending && styles.exportBtnDisabled]}
            onPress={() => exportMutation.mutate('pdf')}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.exportBtnText}>PDF</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.exportBtnAlt, exportMutation.isPending && styles.exportBtnDisabled]}
            onPress={() => exportMutation.mutate('excel')}
            disabled={exportMutation.isPending}
          >
            <Text style={styles.exportBtnAltText}>Excel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function BatchReadinessReportPanel() {
  const query = useQuery({
    queryKey: ['batch-readiness-report'],
    queryFn: fetchBatchReadinessReport,
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Unable to load batch readiness report.</Text>
      </View>
    );
  }

  return <ReportContent report={query.data} />;
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  errorText: { fontSize: 12, color: '#B3261E' },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  heroTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  heroSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  heroMeta: { fontSize: 10, color: '#888', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#444', marginBottom: 8, marginTop: 4 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierBarRow: { gap: 4 },
  tierBarLabel: { fontSize: 12, fontWeight: '600', color: '#1A1A2E' },
  tierBarCount: { fontSize: 11, fontWeight: '700' },
  tierTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0F0F5',
    overflow: 'hidden',
  },
  tierFill: { height: '100%', borderRadius: 4 },
  gapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  gapLabel: { fontSize: 12, color: '#333', flex: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: '700' },
  deptRow: { gap: 4 },
  deptLabel: { fontSize: 12, fontWeight: '600', color: '#1A1A2E' },
  deptPercent: { fontSize: 11, fontWeight: '700' },
  forecastSummary: { fontSize: 12, color: '#444', lineHeight: 18 },
  forecastStats: { flexDirection: 'row', gap: 8, marginTop: 10 },
  forecastStat: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    borderRadius: 8,
    padding: 8,
  },
  forecastLabel: { fontSize: 9, color: '#888' },
  forecastValue: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 2 },
  forecastGreen: { color: '#0F6E56' },
  linkCard: {
    backgroundColor: '#EEEDFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  linkTitle: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
  linkSubtitle: { fontSize: 11, color: '#555', marginTop: 4 },
  exportCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
    marginBottom: 16,
  },
  exportHint: { fontSize: 11, color: '#666', marginBottom: 8 },
  exportSuccess: { fontSize: 11, color: '#0F6E56', marginBottom: 6 },
  exportError: { fontSize: 11, color: '#B3261E', marginBottom: 6 },
  exportRow: { flexDirection: 'row', gap: 8 },
  exportBtn: {
    flex: 1,
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  exportBtnAlt: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND_PRIMARY,
  },
  exportBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  exportBtnAltText: { fontSize: 12, fontWeight: '700', color: BRAND_PRIMARY },
  exportBtnDisabled: { opacity: 0.6 },
});
