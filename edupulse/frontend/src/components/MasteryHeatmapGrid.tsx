import type { MasteryBand, MasteryHeatmap } from '@/src/lib/marks-api';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

const BAND_STYLES: Record<MasteryBand, { bg: string; text: string }> = {
  green: { bg: '#D8F3E5', text: '#0F6E56' },
  amber: { bg: '#FEF3C7', text: '#854F0B' },
  red: { bg: '#FEE2E2', text: '#A32D2D' },
  missing: { bg: '#EDF2F7', text: '#A0AEC0' },
};

type Props = {
  heatmap: MasteryHeatmap;
  onClusterPress: (coTag: string) => void;
};

export function MasteryHeatmapGrid({ heatmap, onClusterPress }: Props) {
  const highlighted = heatmap.weakClusters.filter((cluster) => cluster.isHighlighted);

  return (
    <View style={styles.wrap}>
      <View style={styles.tableHeader} accessibilityRole="header">
        <Text style={[styles.th, styles.nameCol]}>Student</Text>
        {heatmap.courseOutcomes.map((outcome) => {
          const cluster = heatmap.weakClusters.find((entry) => entry.coTag === outcome.coTag);
          const isTappable = cluster?.isHighlighted ?? false;
          return (
            <Pressable
              key={outcome.coTag}
              onPress={isTappable ? () => onClusterPress(outcome.coTag) : undefined}
              accessibilityRole={isTappable ? 'button' : undefined}
              accessibilityLabel={
                isTappable ? `Drill down into weak ${outcome.coTag} cluster` : outcome.coTag
              }
            >
              <Text style={[styles.th, styles.coCol, cluster?.isHighlighted && styles.thHighlight]}>
                {outcome.coTag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={heatmap.rows}
        keyExtractor={(row) => row.usn}
        initialNumToRender={12}
        windowSize={8}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            <Text style={[styles.td, styles.nameCol]} numberOfLines={1}>
              {row.studentName.split(' ')[0]}
            </Text>
            {row.cells.map((cell) => {
              const palette = BAND_STYLES[cell.band];
              const cluster = heatmap.weakClusters.find((entry) => entry.coTag === cell.coTag);
              const isWeakCell = cluster?.isHighlighted && cell.band === 'red';
              const content = (
                <View
                  style={[styles.cell, styles.coCol, { backgroundColor: palette.bg }]}
                  accessibilityLabel={`${row.studentName} ${cell.coTag} ${cell.masteryPercent ?? 'no data'} percent`}
                >
                  <Text style={[styles.cellText, { color: palette.text }]}>
                    {cell.masteryPercent ?? '—'}
                  </Text>
                </View>
              );

              if (!isWeakCell) return <View key={cell.coTag}>{content}</View>;

              return (
                <Pressable key={cell.coTag} onPress={() => onClusterPress(cell.coTag)}>
                  {content}
                </Pressable>
              );
            })}
          </View>
        )}
      />

      {highlighted.map((cluster) => (
        <Pressable
          key={cluster.coTag}
          style={styles.alertCard}
          accessibilityRole="button"
          accessibilityLabel={`View ${cluster.weakCount} students weak in ${cluster.coTag}`}
          onPress={() => onClusterPress(cluster.coTag)}
        >
          <Text style={styles.alertTitle}>
            {cluster.weakCount} students weak in {cluster.coTag}
          </Text>
          <Text style={styles.alertBody}>
            {cluster.title} · {Math.round(cluster.weakPercent * 100)}% below 40% mastery · tap to
            view students
          </Text>
        </Pressable>
      ))}

      <Text style={styles.legend}>
        Legend: <Text style={styles.legendGreen}>■</Text> ≥70%{'  '}
        <Text style={styles.legendAmber}>■</Text> 40–69%{'  '}
        <Text style={styles.legendRed}>■</Text> &lt;40%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCC',
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8EE',
    paddingHorizontal: 4,
  },
  th: { fontSize: 10, fontWeight: '700', color: '#4A5568', textAlign: 'center' },
  thHighlight: { color: '#A32D2D' },
  td: { fontSize: 11, color: '#718096' },
  nameCol: { width: 56, textAlign: 'left' },
  coCol: { width: 44, marginHorizontal: 1 },
  cell: {
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 11, fontWeight: '700' },
  alertCard: {
    marginTop: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertTitle: { fontSize: 12, fontWeight: '700', color: '#A32D2D', marginBottom: 4 },
  alertBody: { fontSize: 11, color: '#7F1D1D', lineHeight: 16 },
  legend: { fontSize: 10, color: '#888', marginTop: 10 },
  legendGreen: { color: '#0F6E56' },
  legendAmber: { color: '#854F0B' },
  legendRed: { color: '#A32D2D' },
});
