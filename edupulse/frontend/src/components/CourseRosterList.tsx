import { BRAND_PRIMARY } from '@/src/constants/theme';
import type { CourseRoster } from '@/src/lib/cohort-api';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

type Props = {
  roster: CourseRoster | undefined;
  isLoading: boolean;
  subtitle?: string;
};

export function CourseRosterList({ roster, isLoading, subtitle }: Props) {
  if (isLoading) {
    return <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />;
  }

  if (!roster) {
    return <Text style={styles.empty}>No roster data available.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {roster.total} students · {roster.section ?? '—'} · {roster.semester ?? '—'}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.usnCol]}>USN</Text>
        <Text style={[styles.th, styles.nameCol]}>Student</Text>
      </View>

      <FlatList
        data={roster.students}
        keyExtractor={(item) => item.usn}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.td, styles.usnCol]}>{item.usn}</Text>
            <Text style={[styles.td, styles.nameCol]}>{item.name}</Text>
          </View>
        )}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { textAlign: 'center', color: '#888', marginTop: 24 },
  meta: { marginBottom: 12 },
  metaText: { fontSize: 11, color: '#888', fontWeight: '600' },
  subtitle: { fontSize: 11, color: '#666', marginTop: 4 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    paddingBottom: 6,
    marginBottom: 4,
  },
  th: { fontSize: 10, fontWeight: '700', color: '#888' },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  td: { fontSize: 12, color: '#1A1A2E' },
  usnCol: { width: '42%' },
  nameCol: { flex: 1 },
  list: { flex: 1 },
});
