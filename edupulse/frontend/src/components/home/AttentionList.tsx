import type { AttentionItem } from '@/src/lib/home-api';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  items: AttentionItem[];
  onItemPress?: (item: AttentionItem) => void;
};

const SEVERITY_BORDER: Record<AttentionItem['severity'], string> = {
  amber: '#E8A317',
  red: '#E24B4A',
  neutral: '#534AB7',
};

export function AttentionList({ items, onItemPress }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Needs your attention</Text>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={[
            styles.card,
            { borderLeftColor: SEVERITY_BORDER[item.severity] },
          ]}
          onPress={() => onItemPress?.(item)}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#FFF',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  title: {
    fontWeight: '700',
    fontSize: 13,
    color: '#1A1A2E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
});
