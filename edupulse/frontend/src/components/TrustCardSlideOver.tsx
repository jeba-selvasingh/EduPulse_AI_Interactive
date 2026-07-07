import { BRAND_PRIMARY } from '@/src/constants/theme';
import { AuditTrailSection } from '@/src/components/AuditTrailSection';
import { useTrustCard } from '@/src/hooks/useTrustCard';
import {
  formatBlueprintStatus,
  formatConfidence,
  sourceIcon,
} from '@/src/lib/trust-card';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  artifactId: string | null;
  visible: boolean;
  onClose: () => void;
};

export function TrustCardSlideOver({ artifactId, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError } = useTrustCard(visible ? artifactId : null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss trust card" />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Trust card</Text>
            {data?.verified ? (
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            ) : null}
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={BRAND_PRIMARY} />
            </View>
          ) : null}

          {isError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>Could not load trust card.</Text>
            </View>
          ) : null}

          {data ? (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Artifact</Text>
                <Text style={styles.cardValue}>{data.artifactLabel}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Sources used</Text>
                {data.sources.map((source) => (
                  <View key={source.label} style={styles.row}>
                    <Text style={styles.rowText} numberOfLines={2}>
                      {sourceIcon(source.kind)} {source.label}
                    </Text>
                    <Text style={styles.rowLink}>↗</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.muted}>Model</Text>
                  <Text style={styles.rowValue}>{data.modelName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.muted}>Prompt version</Text>
                  <Text style={styles.rowValue}>{data.promptVersion}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.muted}>Confidence</Text>
                  <Text style={styles.good}>{formatConfidence(data.confidence)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.muted}>Blueprint check</Text>
                  <Text
                    style={
                      data.blueprintCheckStatus === 'pass'
                        ? styles.good
                        : data.blueprintCheckStatus === 'fail'
                          ? styles.bad
                          : styles.warn
                    }
                  >
                    {formatBlueprintStatus(data.blueprintCheckStatus)}
                  </Text>
                </View>
              </View>

              {data ? (
                <AuditTrailSection artifactId={data.id} events={data.auditTrail} />
              ) : null}

              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Dismiss</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#F7F7FA',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
    minHeight: 320,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  verifiedPill: {
    backgroundColor: '#E6F4EA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F6E56',
  },
  centered: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    color: '#C5221F',
    fontSize: 13,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  cardLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1A1A2E',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  rowText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  rowLink: {
    fontSize: 12,
    color: BRAND_PRIMARY,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
    flexShrink: 1,
  },
  muted: {
    fontSize: 12,
    color: '#888',
  },
  good: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F6E56',
  },
  bad: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C5221F',
  },
  warn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B06000',
  },
  closeBtn: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeBtnText: {
    fontSize: 13,
    color: BRAND_PRIMARY,
    fontWeight: '600',
  },
});
