import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import {
  approvePaperModeration,
  fetchModerationStatus,
  fetchNotifications,
  returnPaperModeration,
  submitPaperForModeration,
} from '@/src/lib/moderation-api';
import { exportApprovedPaperPdf } from '@/src/lib/export-paper-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function statusLabel(status: string) {
  switch (status) {
    case 'submitted':
      return 'Awaiting moderation';
    case 'approved':
      return 'Approved';
    case 'returned':
      return 'Returned for changes';
    default:
      return 'Draft';
  }
}

export default function PaperModerationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paperId, courseCode } = useLocalSearchParams<{
    paperId?: string;
    courseCode?: string;
  }>();

  const canSubmit = usePermission(Permission.PaperModerationSubmit);
  const canReview = usePermission(Permission.PaperModerationReview);
  const allowed = canSubmit || canReview;

  const [returnComments, setReturnComments] = useState('');
  const [exportResult, setExportResult] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['paper-moderation', paperId],
    queryFn: () => fetchModerationStatus(paperId!),
    enabled: Boolean(paperId) && allowed,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: allowed,
  });

  const submit = useMutation({
    mutationFn: () => submitPaperForModeration(paperId!),
    onSuccess: (data) => {
      queryClient.setQueryData(['paper-moderation', paperId], data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const approve = useMutation({
    mutationFn: () => approvePaperModeration(paperId!),
    onSuccess: (data) => {
      queryClient.setQueryData(['paper-moderation', paperId], data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const returnPackage = useMutation({
    mutationFn: () => returnPaperModeration(paperId!, returnComments),
    onSuccess: (data) => {
      queryClient.setQueryData(['paper-moderation', paperId], data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setReturnComments('');
    },
  });

  const exportPdf = useMutation({
    mutationFn: () => exportApprovedPaperPdf(paperId!),
    onSuccess: (data) => {
      setExportResult(
        `${data.fileName} · ${Math.round(data.byteLength / 1024)} KB · ${data.institutionName}`,
      );
    },
  });

  if (!allowed) {
    return <AccessDenied featureName="Paper Moderation" />;
  }

  if (!paperId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>No paper ID provided.</Text>
      </SafeAreaView>
    );
  }

  const record = statusQuery.data;
  const displayCourse = courseCode ?? record?.courseCode ?? 'BCS304';
  const paperNotifications =
    notificationsQuery.data?.filter((notification) => notification.paperId === paperId) ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Moderation · {displayCourse}</Text>
          <Text style={styles.subtitle}>
            Submit paper package for CoE approval before Answer Sheet AI
          </Text>

          {statusQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : record ? (
            <>
              <View style={styles.card}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusPill,
                      record.status === 'approved' && styles.statusApproved,
                      record.status === 'submitted' && styles.statusSubmitted,
                      record.status === 'returned' && styles.statusReturned,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{statusLabel(record.status)}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {record.examType} · {record.isLocked ? 'Locked from edit' : 'Editable'}
                </Text>
                {record.answerSheetUnlocked ? (
                  <Text style={styles.unlocked}>Answer Sheet AI unlocked for this exam</Text>
                ) : null}
                {record.changeComments ? (
                  <View style={styles.commentsBox}>
                    <Text style={styles.commentsTitle}>Moderator comments</Text>
                    <Text style={styles.commentsBody}>{record.changeComments}</Text>
                  </View>
                ) : null}
              </View>

              {canSubmit && (record.status === 'draft' || record.status === 'returned') ? (
                <Pressable
                  style={[styles.primaryBtn, submit.isPending && styles.btnDisabled]}
                  onPress={() => submit.mutate()}
                  disabled={submit.isPending}
                >
                  {submit.isPending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit package for moderation</Text>
                  )}
                </Pressable>
              ) : null}

              {canSubmit && record.status === 'approved' ? (
                <View style={styles.exportCard}>
                  <Text style={styles.exportTitle}>Export for printing</Text>
                  <Text style={styles.exportHint}>
                    Download branded PDF with question paper and answer key for exam distribution.
                  </Text>
                  <Pressable
                    style={[styles.primaryBtn, exportPdf.isPending && styles.btnDisabled]}
                    onPress={() => exportPdf.mutate()}
                    disabled={exportPdf.isPending}
                  >
                    {exportPdf.isPending ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>⬇ Export PDF</Text>
                    )}
                  </Pressable>
                  {exportResult ? (
                    <Text style={styles.exportResult}>Ready: {exportResult}</Text>
                  ) : null}
                  {exportPdf.isError ? (
                    <Text style={styles.exportError}>Could not export PDF.</Text>
                  ) : null}
                </View>
              ) : null}

              {canReview && record.status === 'submitted' ? (
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewTitle}>Moderator actions</Text>
                  <Pressable
                    style={[styles.approveBtn, approve.isPending && styles.btnDisabled]}
                    onPress={() => approve.mutate()}
                    disabled={approve.isPending}
                  >
                    {approve.isPending ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Approve package</Text>
                    )}
                  </Pressable>

                  <TextInput
                    style={styles.commentsInput}
                    value={returnComments}
                    onChangeText={setReturnComments}
                    placeholder="Change comments for faculty…"
                    placeholderTextColor="#AAA"
                    multiline
                  />
                  <Pressable
                    style={[
                      styles.returnBtn,
                      (returnPackage.isPending || returnComments.trim().length === 0) &&
                        styles.btnDisabled,
                    ]}
                    onPress={() => returnPackage.mutate()}
                    disabled={returnPackage.isPending || returnComments.trim().length === 0}
                  >
                    <Text style={styles.returnBtnText}>Return for changes</Text>
                  </Pressable>
                </View>
              ) : null}

              {paperNotifications.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Notifications</Text>
                  {paperNotifications.map((notification) => (
                    <View key={notification.id} style={styles.notificationRow}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationBody}>{notification.body}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.error}>Could not load moderation status.</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  back: { padding: 16 },
  backText: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: '600' },
  body: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  loader: { marginVertical: 24 },
  error: { fontSize: 13, color: '#A32D2D', padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECF2',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: { fontSize: 12, fontWeight: '600', color: '#444' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ECECF2',
  },
  statusSubmitted: { backgroundColor: '#FFF3D6' },
  statusApproved: { backgroundColor: '#E1F5EE' },
  statusReturned: { backgroundColor: '#FCEBEB' },
  statusPillText: { fontSize: 10, fontWeight: '700', color: '#1A1A2E' },
  meta: { fontSize: 11, color: '#888' },
  unlocked: {
    fontSize: 12,
    fontWeight: '600',
    color: '#085041',
    marginTop: 10,
  },
  commentsBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5CFCF',
  },
  commentsTitle: { fontSize: 11, fontWeight: '700', color: '#A32D2D', marginBottom: 4 },
  commentsBody: { fontSize: 12, color: '#555', lineHeight: 18 },
  primaryBtn: {
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECF2',
    gap: 10,
  },
  reviewTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  approveBtn: {
    backgroundColor: '#085041',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  commentsInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E0E0EA',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFC',
    textAlignVertical: 'top',
  },
  returnBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E24B4A',
  },
  returnBtnText: { color: '#E24B4A', fontWeight: '700', fontSize: 13 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  notificationRow: { marginBottom: 10 },
  notificationTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  notificationBody: { fontSize: 11, color: '#666', lineHeight: 16, marginTop: 2 },
  exportCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECF2',
    gap: 8,
  },
  exportTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  exportHint: { fontSize: 11, color: '#666', lineHeight: 16 },
  exportResult: { fontSize: 11, color: '#085041', fontWeight: '600' },
  exportError: { fontSize: 11, color: '#A32D2D' },
});
