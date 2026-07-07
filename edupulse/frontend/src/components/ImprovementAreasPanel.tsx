import {
  areaCardStyle,
  fetchImprovementPlan,
  priorityPillStyle,
  updateImprovementItem,
  type ImprovementArea,
} from '@/src/lib/diagnosis-api';
import { useAuthStore } from '@/src/stores/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  usn?: string;
  courseCode?: string;
  questionId?: string;
  examType?: string;
};

function AreaCard({
  area,
  canEdit,
  editUsn,
  onSaved,
}: {
  area: ImprovementArea;
  canEdit: boolean;
  editUsn: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(area.impactSummary);
  const cardColors = areaCardStyle(area.priority, area.isFocused);
  const pill = priorityPillStyle(area.priority);

  const saveMutation = useMutation({
    mutationFn: () => updateImprovementItem(area.itemId, editUsn, draft.trim()),
    onSuccess: () => {
      setEditing(false);
      onSaved();
    },
  });

  return (
    <View style={[styles.card, { backgroundColor: cardColors.backgroundColor, borderColor: cardColors.borderColor }]}>
      <View style={styles.row}>
        <Text style={styles.areaTitle}>
          {area.rank} · {area.title}
        </Text>
        <View style={[styles.pill, { backgroundColor: pill.backgroundColor }]}>
          <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
        </View>
      </View>

      {editing ? (
        <View style={styles.editBlock}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={500}
          />
          <View style={styles.editActions}>
            <Pressable onPress={() => setEditing(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.saveBtn}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || draft.trim().length === 0}
            >
              <Text style={styles.saveBtnText}>{saveMutation.isPending ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.summary}>{area.impactSummary}</Text>
      )}

      {area.facultyAttribution ? (
        <Text style={styles.attribution}>
          Updated by {area.facultyAttribution.facultyName} · faculty guidance
        </Text>
      ) : null}

      {canEdit && !editing ? (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.editLink}>Edit guidance</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ImprovementAreasPanel({ usn, courseCode, questionId, examType }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const canEdit = roles.includes('faculty') || roles.includes('admin');

  const query = useQuery({
    queryKey: ['improvement-plan', usn ?? 'self', courseCode ?? 'all', questionId ?? 'none'],
    queryFn: () => fetchImprovementPlan({ usn, courseCode, questionId, examType }),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Building improvement plan…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load improvement plan'}
        </Text>
      </View>
    );
  }

  const plan = query.data;
  const editUsn = plan.usn;

  return (
    <View>
      {plan.rankedAreas.map((area) => (
        <AreaCard
          key={area.itemId}
          area={area}
          canEdit={canEdit}
          editUsn={editUsn}
          onSaved={() => void queryClient.invalidateQueries({ queryKey: ['improvement-plan'] })}
        />
      ))}

      <Text style={styles.caption}>{plan.rankCaption}</Text>

      <Pressable
        style={styles.cta}
        onPress={() => router.push(plan.eightWeekPlanRoute as '/improvement-plan')}
      >
        <Text style={styles.ctaText}>See 8-week plan →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: '#888' },
  errorText: { fontSize: 13, color: '#9B1C1C', textAlign: 'center', paddingHorizontal: 16 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  areaTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
  summary: { fontSize: 12, color: '#4A5568', lineHeight: 18 },
  attribution: { marginTop: 8, fontSize: 10, color: '#534AB7', fontWeight: '600' },
  editLink: { marginTop: 8, fontSize: 11, fontWeight: '700', color: '#534AB7' },
  caption: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  cta: {
    backgroundColor: '#534AB7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  editBlock: { marginTop: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    minHeight: 72,
    backgroundColor: '#FFF',
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  cancelText: { fontSize: 12, color: '#888' },
  saveBtn: {
    backgroundColor: '#534AB7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
