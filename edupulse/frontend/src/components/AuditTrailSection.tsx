import { BRAND_PRIMARY } from '@/src/constants/theme';
import {
  appendApprovalAudit,
  appendEditAudit,
  appendOverrideAudit,
  eventTypeLabel,
  type AuditEvent,
} from '@/src/lib/audit-api';
import { formatAuditDate } from '@/src/lib/trust-card';
import { Permission, hasPermission } from '@/src/lib/rbac';
import { useAuthStore } from '@/src/stores/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  artifactId: string;
  events: AuditEvent[];
};

export function AuditTrailSection({ artifactId, events }: Props) {
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['trust-card', artifactId] });
  };

  const overrideMutation = useMutation({
    mutationFn: () =>
      appendOverrideAudit({
        artifactId,
        summary: 'Faculty overrode AI mark on Q3',
        field: 'mark',
        beforeValue: '4',
        afterValue: '5',
      }),
    onSuccess: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: () =>
      appendEditAudit({
        artifactId,
        summary: 'Faculty rephrased question wording',
        field: 'question',
        beforeValue: 'Define BCNF.',
        afterValue: 'Define Boyce-Codd Normal Form with an example.',
      }),
    onSuccess: invalidate,
  });

  const approvalMutation = useMutation({
    mutationFn: () =>
      appendApprovalAudit({
        artifactId,
        summary: 'Moderator approved paper package',
        field: 'package',
        beforeValue: 'pending_moderation',
        afterValue: 'approved',
      }),
    onSuccess: invalidate,
  });

  const canOverride = hasPermission(roles, Permission.AuditAppendOverride);
  const canEdit = hasPermission(roles, Permission.AuditAppendEdit);
  const canApprove = hasPermission(roles, Permission.AuditAppendApproval);
  const isPending =
    overrideMutation.isPending || editMutation.isPending || approvalMutation.isPending;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Audit trail</Text>

      {events.length === 0 ? (
        <Text style={styles.empty}>No human edits recorded yet.</Text>
      ) : (
        events.map((entry) => (
          <View key={entry.id} style={styles.entry}>
            <View style={styles.entryHeader}>
              <Text style={styles.eventType}>{eventTypeLabel(entry.eventType)}</Text>
              <Text style={styles.timestamp}>{formatAuditDate(entry.occurredAt)}</Text>
            </View>
            <Text style={styles.summary}>{entry.summary}</Text>
            <Text style={styles.actor}>
              {entry.userName} · {entry.userEmail}
            </Text>
            {entry.beforeValue != null && entry.afterValue != null ? (
              <Text style={styles.delta}>
                {entry.field ? `${entry.field}: ` : ''}
                {entry.beforeValue} → {entry.afterValue}
              </Text>
            ) : null}
          </View>
        ))
      )}

      {canOverride || canEdit || canApprove ? (
        <View style={styles.demoActions}>
          <Text style={styles.demoLabel}>Record event (pilot demo)</Text>
          <View style={styles.demoRow}>
            {canOverride ? (
              <Pressable
                style={styles.demoBtn}
                disabled={isPending}
                onPress={() => overrideMutation.mutate()}
              >
                <Text style={styles.demoBtnText}>Log override</Text>
              </Pressable>
            ) : null}
            {canEdit ? (
              <Pressable
                style={styles.demoBtn}
                disabled={isPending}
                onPress={() => editMutation.mutate()}
              >
                <Text style={styles.demoBtnText}>Log edit</Text>
              </Pressable>
            ) : null}
            {canApprove ? (
              <Pressable
                style={styles.demoBtn}
                disabled={isPending}
                onPress={() => approvalMutation.mutate()}
              >
                <Text style={styles.demoBtnText}>Log approval</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1A1A2E',
  },
  empty: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  entry: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 10,
    fontWeight: '700',
    color: BRAND_PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 10,
    color: '#888',
  },
  summary: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actor: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  delta: {
    fontSize: 11,
    color: '#555',
    fontFamily: 'monospace',
  },
  demoActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
  },
  demoLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 8,
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoBtn: {
    backgroundColor: '#EEEDFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_PRIMARY,
  },
});
