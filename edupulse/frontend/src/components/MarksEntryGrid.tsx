import { BRAND_PRIMARY } from '@/src/constants/theme';
import type { MarksGrid, MarksQuestion, PartialSaveCell } from '@/src/lib/marks-api';
import { partialSaveMarks } from '@/src/lib/marks-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

type Props = {
  grid: MarksGrid;
  courseCode: string;
  examType: string;
};

type CellDraft = {
  value: string;
  error: string | null;
};

function cellKey(usn: string, questionId: string) {
  return `${usn}:${questionId}`;
}

function parseMarkInput(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) return 'invalid';
  return parsed;
}

function validateLocal(marks: number | null, question: MarksQuestion): string | null {
  if (marks === null) return null;
  if (marks < 0) return 'Mark cannot be negative';
  if (marks > question.maxMarks) return `Max ${question.maxMarks}`;
  return null;
}

export function MarksEntryGrid({ grid, courseCode, examType }: Props) {
  const queryClient = useQueryClient();
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const [drafts, setDrafts] = useState<Record<string, CellDraft>>(() => {
    const initial: Record<string, CellDraft> = {};
    for (const row of grid.rows) {
      for (const cell of row.cells) {
        initial[cellKey(cell.usn, cell.questionId)] = {
          value: cell.marks === null ? '' : String(cell.marks),
          error: null,
        };
      }
    }
    return initial;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const questionById = useMemo(
    () => new Map(grid.questions.map((question) => [question.id, question])),
    [grid.questions],
  );

  const orderedCellKeys = useMemo(() => {
    const keys: string[] = [];
    for (const row of grid.rows) {
      for (const question of grid.questions) {
        keys.push(cellKey(row.usn, question.id));
      }
    }
    return keys;
  }, [grid.rows, grid.questions]);

  const focusNext = useCallback(
    (currentKey: string) => {
      const index = orderedCellKeys.indexOf(currentKey);
      if (index < 0 || index >= orderedCellKeys.length - 1) return;
      const nextKey = orderedCellKeys[index + 1];
      inputRefs.current[nextKey]?.focus();
    },
    [orderedCellKeys],
  );

  const saveMutation = useMutation({
    mutationFn: ({
      courseCode: code,
      examType: exam,
      cells,
    }: {
      courseCode: string;
      examType: string;
      cells: PartialSaveCell[];
    }) => partialSaveMarks(code, exam, cells),
    onSuccess: (result) => {
      queryClient.setQueryData(['marks-grid', courseCode, examType], result.grid);
      void queryClient.invalidateQueries({ queryKey: ['mastery-heatmap', courseCode, examType] });
    },
  });

  const persistCell = useCallback(
    async (usn: string, questionId: string, rawValue: string) => {
      if (grid.isReadOnly) return;
      const key = cellKey(usn, questionId);
      const question = questionById.get(questionId);
      if (!question) return;

      const parsed = parseMarkInput(rawValue);
      if (parsed === 'invalid') {
        setDrafts((prev) => ({
          ...prev,
          [key]: { value: rawValue, error: 'Enter a whole number' },
        }));
        return;
      }

      const localError = validateLocal(parsed, question);
      if (localError) {
        setDrafts((prev) => ({
          ...prev,
          [key]: { value: rawValue, error: localError },
        }));
        return;
      }

      setSavingKey(key);
      try {
        const result = await saveMutation.mutateAsync({
          courseCode,
          examType,
          cells: [{ usn, questionId, marks: parsed }],
        });

        const rejected = result.rejected.find(
          (item) => item.usn === usn && item.questionId === questionId,
        );
        if (rejected) {
          setDrafts((prev) => ({
            ...prev,
            [key]: { value: rawValue, error: rejected.message },
          }));
          return;
        }

        const savedCell = result.grid.rows
          .find((row) => row.usn === usn)
          ?.cells.find((cell) => cell.questionId === questionId);

        setDrafts((prev) => ({
          ...prev,
          [key]: {
            value: savedCell?.marks === null || savedCell?.marks === undefined ? '' : String(savedCell.marks),
            error: null,
          },
        }));
      } finally {
        setSavingKey(null);
      }
    },
    [courseCode, examType, grid.isReadOnly, questionById, saveMutation],
  );

  const handleKeyPress = useCallback(
    (key: string, event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (Platform.OS !== 'web') return;
      const native = event.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
      if (native.key === 'Tab' && !native.shiftKey) {
        event.preventDefault?.();
        focusNext(key);
      }
    },
    [focusNext],
  );

  const renderRow = useCallback(
    ({ item: row }: { item: MarksGrid['rows'][number] }) => {
      const rowTotal = row.cells.every((cell) => cell.isSaved || drafts[cellKey(cell.usn, cell.questionId)]?.value)
        ? row.cells.reduce((sum, cell) => {
            const draft = drafts[cellKey(cell.usn, cell.questionId)];
            const parsed = parseMarkInput(draft?.value ?? (cell.marks === null ? '' : String(cell.marks)));
            return sum + (typeof parsed === 'number' ? parsed : 0);
          }, 0)
        : row.rowTotal;

      return (
        <View style={styles.row} accessibilityRole="none">
          <Text style={[styles.td, styles.usnCol]} accessibilityLabel={`USN ${row.usn}`}>
            {row.usn}
          </Text>
          <Text style={[styles.td, styles.nameCol]} numberOfLines={1}>
            {row.studentName}
          </Text>
          {grid.questions.map((question) => {
            const key = cellKey(row.usn, question.id);
            const draft = drafts[key] ?? { value: '', error: null };
            const isSaving = savingKey === key;
            const cell = row.cells.find((entry) => entry.questionId === question.id);
            const readOnly = grid.isReadOnly || cell?.isReadOnly;

            if (readOnly) {
              const display =
                cell?.marks ?? (draft.value === '' ? null : Number.parseInt(draft.value, 10));
              return (
                <View key={question.id} style={styles.markCol}>
                  <Text style={styles.readOnlyMark}>{display ?? '—'}</Text>
                </View>
              );
            }

            return (
              <View key={question.id} style={styles.markCol}>
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[key] = ref;
                  }}
                  style={[styles.input, draft.error ? styles.inputError : null]}
                  value={draft.value}
                  onChangeText={(text) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: { value: text.replace(/[^\d]/g, ''), error: null },
                    }))
                  }
                  onBlur={() => void persistCell(row.usn, question.id, draft.value)}
                  onSubmitEditing={() => {
                    void persistCell(row.usn, question.id, draft.value);
                    focusNext(key);
                  }}
                  onKeyPress={(event) => handleKeyPress(key, event)}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  maxLength={2}
                  accessibilityLabel={`${row.studentName} ${question.questionKey} out of ${question.maxMarks}`}
                  accessibilityHint="Enter marks and press next to move to the following cell"
                  nativeID={key}
                  {...(Platform.OS === 'web'
                    ? ({
                        tabIndex: orderedCellKeys.indexOf(key) + 1,
                      } as { tabIndex: 0 })
                    : {})}
                />
                {isSaving ? <ActivityIndicator size="small" color={BRAND_PRIMARY} style={styles.saving} /> : null}
                {draft.error ? (
                  <Text style={styles.errorText} accessibilityLiveRegion="polite">
                    {draft.error}
                  </Text>
                ) : null}
              </View>
            );
          })}
          <Text style={[styles.td, styles.totalCol]} accessibilityLabel={`Total ${rowTotal ?? 'incomplete'}`}>
            {rowTotal ?? '—'}
          </Text>
        </View>
      );
    },
    [drafts, focusNext, grid.isReadOnly, grid.questions, handleKeyPress, orderedCellKeys, persistCell, savingKey],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.tableHeader} accessibilityRole="header">
        <Text style={[styles.th, styles.usnCol]}>USN</Text>
        <Text style={[styles.th, styles.nameCol]}>Student</Text>
        {grid.questions.map((question) => (
          <Text key={question.id} style={[styles.th, styles.markCol]}>
            {question.questionKey}/{question.maxMarks}
          </Text>
        ))}
        <Text style={[styles.th, styles.totalCol]}>Total</Text>
      </View>

      <FlatList
        data={grid.rows}
        keyExtractor={(row) => row.usn}
        renderItem={renderRow}
        initialNumToRender={12}
        windowSize={8}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  list: { paddingBottom: 24 },
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
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8EE',
    paddingHorizontal: 4,
  },
  th: { fontSize: 10, fontWeight: '700', color: '#4A5568', textTransform: 'uppercase' },
  td: { fontSize: 11, color: '#1A1A2E' },
  usnCol: { width: 88 },
  nameCol: { flex: 1, minWidth: 72, paddingRight: 4 },
  markCol: { width: 52, alignItems: 'center' },
  totalCol: { width: 36, textAlign: 'right', fontWeight: '700' },
  input: {
    width: 44,
    height: 32,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    backgroundColor: '#FFF',
    color: '#1A1A2E',
  },
  inputError: { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
  readOnlyMark: {
    width: 44,
    height: 32,
    lineHeight: 32,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5568',
    backgroundColor: '#EDF2F7',
    borderRadius: 6,
  },
  errorText: { fontSize: 8, color: '#E53E3E', marginTop: 2, textAlign: 'center', maxWidth: 52 },
  saving: { position: 'absolute', right: -2, top: 8 },
});
