import { StyleSheet, Text, View } from 'react-native';
import type { HomeStats } from '@/src/lib/home-api';

type Props = {
  stats: HomeStats;
};

export function StatsRow({ stats }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.label}>Papers this sem</Text>
        <Text style={styles.value}>{stats.papersThisSem}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Hours saved</Text>
        <Text style={[styles.value, styles.valueGreen]}>{stats.hoursSaved}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  label: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  valueGreen: {
    color: '#0F6E56',
  },
});
