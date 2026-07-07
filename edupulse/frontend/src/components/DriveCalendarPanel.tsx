import {
  driveUrgencyToneStyle,
  fetchDriveCalendar,
  fetchDriveCalendarDetail,
  queueDriveReminder,
  registrationPillStyle,
  type DriveCalendarDetail,
  type DriveCalendarEntry,
  type DriveCalendarView,
  type DriveReminderResult,
} from '@/src/lib/campus-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function DriveCard({
  drive,
  highlighted,
  onPress,
}: {
  drive: DriveCalendarEntry;
  highlighted?: boolean;
  onPress: () => void;
}) {
  const tone = driveUrgencyToneStyle(drive.urgencyTone);
  const registration = registrationPillStyle(drive.registrationStatus);

  return (
    <Pressable
      style={[styles.driveCard, highlighted && styles.driveCardHighlight]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <Text style={styles.driveTitle}>
          📅 {drive.driveDateLabel} · {drive.companyName}
        </Text>
        <View style={[styles.pill, { backgroundColor: tone.backgroundColor }]}>
          <Text style={[styles.pillText, { color: tone.color }]}>
            {drive.daysUntilDrive} days
          </Text>
        </View>
      </View>
      <Text style={styles.driveSubtitle}>
        {drive.packageLabel} · {drive.eligibleCount} eligible
        {drive.scheduleNote ? ` · ${drive.scheduleNote}` : ''}
        {drive.venue ? ` · venue: ${drive.venue}` : ''}
      </Text>
      <View style={[styles.row, styles.metaRow]}>
        {drive.registeredCount > 0 ? (
          <View style={[styles.pill, styles.pillGood]}>
            <Text style={[styles.pillText, styles.pillGoodText]}>
              {drive.registeredCount} registered
            </Text>
          </View>
        ) : null}
        {drive.pendingCount > 0 ? (
          <View style={[styles.pill, styles.pillWarn]}>
            <Text style={[styles.pillText, styles.pillWarnText]}>
              {drive.pendingCount} pending
            </Text>
          </View>
        ) : null}
        {drive.registrationOpensLabel ? (
          <View style={[styles.pill, { backgroundColor: registration.backgroundColor }]}>
            <Text style={[styles.pillText, { color: registration.color }]}>
              Registration opens {drive.registrationOpensLabel}
            </Text>
          </View>
        ) : null}
        {drive.registrationStatus === 'open' && drive.pendingCount === 0 && drive.registeredCount > 0 ? (
          <Text style={styles.sendHint}>Send reminder →</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ReminderBanner({
  detail,
  onSend,
  sending,
  lastResult,
}: {
  detail: DriveCalendarDetail;
  onSend: () => void;
  sending: boolean;
  lastResult?: DriveReminderResult;
}) {
  if (!detail.canSendReminder) {
    return null;
  }

  return (
    <View style={styles.alertCard}>
      <Text style={styles.alertTitle}>⚠ Action needed</Text>
      <Text style={styles.alertText}>
        {detail.pendingCount} students eligible for {detail.companyName} have not registered
        {detail.registrationClosesLabel
          ? ` · Registration closes ${detail.registrationClosesLabel}`
          : ''}
        {detail.whatsappPilotEnabled ? ' · Auto-WhatsApp reminder available' : ''}
      </Text>
      {lastResult?.queued ? (
        <Text style={styles.successText}>
          Queued WhatsApp reminders for {lastResult.recipientCount} students
        </Text>
      ) : (
        <Pressable
          style={[styles.reminderButton, sending && styles.reminderButtonDisabled]}
          onPress={onSend}
          disabled={sending}
        >
          <Text style={styles.reminderButtonText}>
            {sending ? 'Queuing reminders…' : 'Send WhatsApp reminders'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function DriveDetailContent({
  detail,
  onBack,
}: {
  detail: DriveCalendarDetail;
  onBack: () => void;
}) {
  const [lastResult, setLastResult] = useState<DriveReminderResult | undefined>();
  const mutation = useMutation({
    mutationFn: () => queueDriveReminder(detail.driveId),
    onSuccess: (result) => setLastResult(result),
  });

  return (
    <View>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>‹ All drives</Text>
      </Pressable>

      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>
          {detail.companyName} · {detail.driveDateLabel}
        </Text>
        <Text style={styles.detailSubtitle}>{detail.rulesSummary}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Eligible</Text>
          <Text style={styles.statValue}>{detail.eligibleCount}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Registered</Text>
          <Text style={styles.statValue}>{detail.registeredCount}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, styles.statWarn]}>{detail.pendingCount}</Text>
        </View>
      </View>

      <ReminderBanner
        detail={detail}
        onSend={() => mutation.mutate()}
        sending={mutation.isPending}
        lastResult={lastResult}
      />

      {detail.unregisteredEligibleCount > 0 ? (
        <>
          <Text style={styles.sectionTitle}>
            Unregistered eligible students ({detail.unregisteredEligibleCount})
          </Text>
          {detail.unregisteredEligibleStudents.map((student) => (
            <View key={student.usn} style={styles.studentRow}>
              <View>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>{student.usn}</Text>
              </View>
              <Text style={styles.studentCgpa}>CGPA {student.cgpa.toFixed(2)}</Text>
            </View>
          ))}
          {detail.unregisteredEligibleCount > detail.unregisteredEligibleStudents.length ? (
            <Text style={styles.moreStudents}>
              +{detail.unregisteredEligibleCount - detail.unregisteredEligibleStudents.length} more
              students pending registration
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function CalendarOverview({
  view,
  onOpenDrive,
}: {
  view: DriveCalendarView;
  onOpenDrive: (driveId: string) => void;
}) {
  return (
    <View>
      {view.actionAlert ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠ Action needed</Text>
          <Text style={styles.alertText}>{view.actionAlert.message}</Text>
          {view.whatsappPilotEnabled ? (
            <Pressable
              style={styles.reminderButton}
              onPress={() => onOpenDrive(view.actionAlert!.driveId)}
            >
              <Text style={styles.reminderButtonText}>Send WhatsApp reminders</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {view.drives.map((drive) => (
        <DriveCard
          key={drive.driveId}
          drive={drive}
          highlighted={view.actionAlert?.driveId === drive.driveId}
          onPress={() => onOpenDrive(drive.driveId)}
        />
      ))}
    </View>
  );
}

export function DriveCalendarPanel({ driveId }: { driveId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const calendarQuery = useQuery({
    queryKey: ['drive-calendar'],
    queryFn: fetchDriveCalendar,
    enabled: !driveId,
  });

  const detailQuery = useQuery({
    queryKey: ['drive-calendar-detail', driveId],
    queryFn: () => fetchDriveCalendarDetail(driveId!),
    enabled: Boolean(driveId),
  });

  const openDrive = (id: string) => {
    router.push(`/drive-calendar?driveId=${id}` as never);
  };

  const goBackToList = () => {
    queryClient.removeQueries({ queryKey: ['drive-calendar-detail', driveId] });
    router.push('/drive-calendar' as never);
  };

  if (driveId) {
    if (detailQuery.isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={BRAND_PRIMARY} />
          <Text style={styles.loadingText}>Loading drive details…</Text>
        </View>
      );
    }

    if (detailQuery.isError || !detailQuery.data) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Unable to load drive details'}
          </Text>
        </View>
      );
    }

    return <DriveDetailContent detail={detailQuery.data} onBack={goBackToList} />;
  }

  if (calendarQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
        <Text style={styles.loadingText}>Loading drive calendar…</Text>
      </View>
    );
  }

  if (calendarQuery.isError || !calendarQuery.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {calendarQuery.error instanceof Error
            ? calendarQuery.error.message
            : 'Unable to load drive calendar'}
        </Text>
      </View>
    );
  }

  return <CalendarOverview view={calendarQuery.data} onOpenDrive={openDrive} />;
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { fontSize: 11, color: '#666', marginTop: 8 },
  errorText: { fontSize: 12, color: '#B3261E', textAlign: 'center' },
  driveCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  driveCardHighlight: {
    backgroundColor: '#EEEDFE',
    borderColor: '#AFA9EC',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  metaRow: { marginTop: 6, flexWrap: 'wrap' },
  driveTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  driveSubtitle: { fontSize: 11, color: '#666', marginTop: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '600' },
  pillGood: { backgroundColor: '#E1F5EE' },
  pillGoodText: { color: '#085041' },
  pillWarn: { backgroundColor: '#FFF4E5' },
  pillWarnText: { color: '#8A5A00' },
  sendHint: { fontSize: 10, color: BRAND_PRIMARY, fontWeight: '600' },
  alertCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FAC775',
  },
  alertTitle: { fontSize: 12, fontWeight: '700', color: '#854F0B', marginBottom: 4 },
  alertText: { fontSize: 11, color: '#5C4A1F', lineHeight: 16 },
  reminderButton: {
    marginTop: 8,
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  reminderButtonDisabled: { opacity: 0.7 },
  reminderButtonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  successText: { fontSize: 11, color: '#085041', marginTop: 8, fontWeight: '600' },
  backLink: { fontSize: 12, color: BRAND_PRIMARY, fontWeight: '600', marginBottom: 10 },
  detailHeader: { marginBottom: 12 },
  detailTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  detailSubtitle: { fontSize: 11, color: '#666', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  statLabel: { fontSize: 10, color: '#888' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 2 },
  statWarn: { color: '#9B1C1C' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#444', marginBottom: 8, marginTop: 4 },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  studentName: { fontSize: 12, fontWeight: '600', color: '#1A1A2E' },
  studentMeta: { fontSize: 10, color: '#888', marginTop: 2 },
  studentCgpa: { fontSize: 11, fontWeight: '600', color: '#534AB7' },
  moreStudents: { fontSize: 10, color: '#666', marginTop: 4, fontStyle: 'italic' },
});
