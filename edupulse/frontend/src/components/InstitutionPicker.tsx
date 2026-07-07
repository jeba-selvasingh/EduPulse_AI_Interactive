import { BRAND_PRIMARY, BRAND_PRIMARY_LIGHT } from '@/src/constants/theme';
import type { InstitutionSummary } from '@/src/lib/institutions';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type InstitutionPickerProps = {
  institutions: InstitutionSummary[];
  selected: InstitutionSummary | null;
  onSelect: (institution: InstitutionSummary) => void;
  loading?: boolean;
  error?: string | null;
};

export function InstitutionPicker({
  institutions,
  selected,
  onSelect,
  loading = false,
  error = null,
}: InstitutionPickerProps) {
  const [open, setOpen] = useState(false);

  const label = loading
    ? 'Loading institutions…'
    : selected
      ? selected.name
      : 'Select your institution';

  const onPick = useCallback(
    (institution: InstitutionSummary) => {
      onSelect(institution);
      setOpen(false);
    },
    [onSelect],
  );

  return (
    <>
      <Pressable
        style={[styles.field, !selected && styles.fieldEmpty]}
        onPress={() => !loading && setOpen(true)}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Select institution"
      >
        <Text style={styles.fieldIcon}>🏫</Text>
        <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select institution</Text>
            <FlatList
              data={institutions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, selected?.id === item.id && styles.optionSelected]}
                  onPress={() => onPick(item)}
                >
                  <Text style={styles.optionName}>{item.name}</Text>
                  <Text style={styles.optionCode}>{item.code.toUpperCase()}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F7F7FA',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E8',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  fieldEmpty: {
    borderColor: BRAND_PRIMARY,
    borderWidth: 1,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
  },
  placeholder: {
    color: '#888',
  },
  chevron: {
    color: '#888',
    fontSize: 12,
  },
  errorText: {
    color: '#B3261E',
    fontSize: 11,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  optionSelected: {
    backgroundColor: BRAND_PRIMARY_LIGHT,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  optionCode: {
    fontSize: 10,
    color: BRAND_PRIMARY,
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
