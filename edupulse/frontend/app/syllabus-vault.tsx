import { AccessDenied } from '@/src/components/AccessDenied';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Permission, usePermission } from '@/src/hooks/usePermission';
import {
  activateSyllabusVersion,
  fetchCourseSyllabus,
  fetchSampleSyllabusPdf,
  fetchSyllabusModules,
  fetchSyllabusVersions,
  PILOT_BCS304_MODULES,
  saveSyllabusModules,
  uploadSyllabusPdf,
  type SyllabusModule,
  type SyllabusRecord,
} from '@/src/lib/syllabus-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

const PILOT_COURSE = 'BCS304';

export default function SyllabusVaultScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canUpload = usePermission(Permission.SyllabusUpload);
  const canRead = usePermission(Permission.SyllabusRead);
  const canActivate = usePermission(Permission.SyllabusActivate);
  const [error, setError] = useState<string | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<SyllabusRecord | null>(null);
  const [moduleNumber, setModuleNumber] = useState('3');
  const [moduleTitle, setModuleTitle] = useState('Trees');
  const [pageStart, setPageStart] = useState('42');
  const [pageEnd, setPageEnd] = useState('58');

  const syllabusQuery = useQuery({
    queryKey: ['syllabus', PILOT_COURSE],
    queryFn: () => fetchCourseSyllabus(PILOT_COURSE),
    enabled: canRead,
    retry: false,
  });

  const modulesQuery = useQuery({
    queryKey: ['syllabus-modules', PILOT_COURSE],
    queryFn: () => fetchSyllabusModules(PILOT_COURSE),
    enabled: canRead && Boolean(syllabusQuery.data ?? lastUpload),
    retry: false,
  });

  const versionsQuery = useQuery({
    queryKey: ['syllabus-versions', PILOT_COURSE],
    queryFn: () => fetchSyllabusVersions(PILOT_COURSE),
    enabled: canRead,
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: (payload: { fileName: string; base64: string }) =>
      uploadSyllabusPdf(PILOT_COURSE, payload),
    onSuccess: (result) => {
      setError(null);
      setLastUpload(result.record);
      void queryClient.invalidateQueries({ queryKey: ['syllabus', PILOT_COURSE] });
      void queryClient.invalidateQueries({ queryKey: ['syllabus-versions', PILOT_COURSE] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const saveModulesMutation = useMutation({
    mutationFn: ([courseCode, modules]: [string, typeof PILOT_BCS304_MODULES]) =>
      saveSyllabusModules(courseCode, modules),
    onSuccess: () => {
      setModuleError(null);
      void queryClient.invalidateQueries({ queryKey: ['syllabus-modules', PILOT_COURSE] });
    },
    onError: (err: Error) => setModuleError(err.message),
  });

  const activateMutation = useMutation({
    mutationFn: (syllabusId: string) => activateSyllabusVersion(PILOT_COURSE, syllabusId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['syllabus', PILOT_COURSE] });
      void queryClient.invalidateQueries({ queryKey: ['syllabus-versions', PILOT_COURSE] });
      void queryClient.invalidateQueries({ queryKey: ['syllabus-modules', PILOT_COURSE] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const onLoadSample = useCallback(async () => {
    setError(null);
    const sample = await fetchSampleSyllabusPdf();
    uploadMutation.mutate({ fileName: sample.fileName, base64: sample.base64 });
  }, [uploadMutation]);

  const onUploadInvalid = useCallback(() => {
    setError(null);
    uploadMutation.mutate({
      fileName: 'notes.txt',
      base64: 'VGhpcyBpcyBub3QgYSBQREYgZmlsZQ==',
    });
  }, [uploadMutation]);

  const onSavePilotModules = useCallback(() => {
    saveModulesMutation.mutate([PILOT_COURSE, PILOT_BCS304_MODULES]);
  }, [saveModulesMutation]);

  const onAddModule = useCallback(() => {
    const num = Number(moduleNumber);
    const start = Number(pageStart);
    const end = Number(pageEnd);
    if (!moduleTitle.trim() || !num || !start || !end) {
      setModuleError('Fill in module number, title, and page range.');
      return;
    }

    const existingInputs = (modulesQuery.data ?? []).map((m) => ({
      moduleNumber: m.moduleNumber,
      title: m.title,
      pageStart: m.pageStart,
      pageEnd: m.pageEnd,
    }));

    const withoutDup = existingInputs.filter((m) => m.moduleNumber !== num);
    const next = [
      ...withoutDup,
      { moduleNumber: num, title: moduleTitle.trim(), pageStart: start, pageEnd: end },
    ].sort((a, b) => a.moduleNumber - b.moduleNumber);

    saveModulesMutation.mutate([PILOT_COURSE, next]);
  }, [moduleNumber, moduleTitle, pageEnd, pageStart, modulesQuery.data, saveModulesMutation]);

  if (!canRead && !canUpload) {
    return <AccessDenied featureName="Syllabus Vault" />;
  }

  const active = lastUpload?.status === 'active' ? lastUpload : syllabusQuery.data ?? lastUpload;
  const modules = modulesQuery.data ?? [];
  const versions = versionsQuery.data ?? [];

  const statusColor = (status: SyllabusRecord['status']) => {
    if (status === 'active') return '#0A7C42';
    if (status === 'pending') return '#B8860B';
    return '#888';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phoneShell}>
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Syllabus Vault</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>📚</Text>
            <Text style={styles.heroTitle}>{PILOT_COURSE} Data Structures</Text>
            <Text style={styles.heroSub}>Odd Sem 2026 · PES CSE pilot</Text>
          </View>

          <Text style={styles.hint}>
            Upload the official syllabus PDF, then define modules with page ranges for Paper Craft
            and Trust Card citations.
          </Text>

          {active ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active syllabus</Text>
              <Text style={styles.fileName}>{active.fileName}</Text>
              <Text style={styles.meta}>
                v{active.version} · {(active.sizeBytes / 1024).toFixed(1)} KB
              </Text>
              <Text style={styles.meta}>
                Uploaded {new Date(active.uploadedAt).toLocaleString()}
              </Text>
            </View>
          ) : syllabusQuery.isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY} style={styles.loader} />
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No syllabus yet</Text>
              <Text style={styles.meta}>Upload a PDF before defining modules.</Text>
            </View>
          )}

          {canUpload ? (
            <View style={styles.actions}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => void onLoadSample()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Upload BCS304 sample PDF</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.outlineBtn}
                onPress={onUploadInvalid}
                disabled={uploadMutation.isPending}
              >
                <Text style={styles.outlineBtnText}>Try invalid file (demo rejection)</Text>
              </Pressable>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {versions.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Version history</Text>
              {versions.map((v) => (
                <View key={v.id} style={styles.versionRow}>
                  <View style={styles.versionMeta}>
                    <Text style={styles.versionTitle}>
                      v{v.version} · {v.fileName}
                    </Text>
                    <Text style={[styles.statusBadge, { color: statusColor(v.status) }]}>
                      {v.status}
                    </Text>
                  </View>
                  {canActivate && v.status === 'pending' ? (
                    <Pressable
                      style={styles.activateBtn}
                      onPress={() => activateMutation.mutate(v.id)}
                      disabled={activateMutation.isPending}
                    >
                      <Text style={styles.activateBtnText}>Activate</Text>
                    </Pressable>
                  ) : null}
                  {v.status === 'superseded' ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/paper-craft',
                          params: { syllabusVersionId: v.id },
                        })
                      }
                    >
                      <Text style={styles.linkText}>Test paper craft warning</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {active && canUpload ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Syllabus modules</Text>
              <Text style={styles.meta}>
                Tag content to page ranges — e.g. Module 3: Trees, pages 42–58.
              </Text>

              {modules.length > 0 ? (
                <View style={styles.moduleList}>
                  {modules.map((m: SyllabusModule) => (
                    <View key={m.id} style={styles.moduleRow}>
                      <Text style={styles.moduleTitle}>
                        Module {m.moduleNumber}: {m.title}
                      </Text>
                      <Text style={styles.meta}>
                        Pages {m.pageStart}–{m.pageEnd}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.meta}>No modules defined yet.</Text>
              )}

              <View style={styles.formRow}>
                <TextInput
                  style={styles.inputSmall}
                  value={moduleNumber}
                  onChangeText={setModuleNumber}
                  keyboardType="number-pad"
                  placeholder="#"
                />
                <TextInput
                  style={styles.inputFlex}
                  value={moduleTitle}
                  onChangeText={setModuleTitle}
                  placeholder="Module title"
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={styles.inputHalf}
                  value={pageStart}
                  onChangeText={setPageStart}
                  keyboardType="number-pad"
                  placeholder="Start page"
                />
                <TextInput
                  style={styles.inputHalf}
                  value={pageEnd}
                  onChangeText={setPageEnd}
                  keyboardType="number-pad"
                  placeholder="End page"
                />
              </View>

              <Pressable
                style={styles.secondaryBtn}
                onPress={onAddModule}
                disabled={saveModulesMutation.isPending}
              >
                <Text style={styles.secondaryBtnText}>Save module</Text>
              </Pressable>

              <Pressable
                style={styles.outlineBtn}
                onPress={onSavePilotModules}
                disabled={saveModulesMutation.isPending}
              >
                <Text style={styles.outlineBtnText}>Load full BCS304 module map (4)</Text>
              </Pressable>

              {moduleError ? <Text style={styles.error}>{moduleError}</Text> : null}
              {saveModulesMutation.isSuccess && !moduleError ? (
                <Text style={styles.success}>Modules saved for Paper Craft.</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E8E8EE', alignItems: 'center' },
  phoneShell: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: '#F7F7FA' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECF2',
  },
  back: { fontSize: 16, color: BRAND_PRIMARY, marginRight: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#222' },
  content: { padding: 16, paddingBottom: 32 },
  hero: {
    backgroundColor: '#E1F5EE',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: { fontSize: 36, marginBottom: 6 },
  heroTitle: { fontSize: 16, fontWeight: '700', color: '#085041' },
  heroSub: { fontSize: 12, color: '#3d6b5f', marginTop: 2 },
  hint: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECECF2',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 6 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#085041' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  loader: { marginVertical: 16 },
  actions: { gap: 8, marginBottom: 8 },
  primaryBtn: {
    backgroundColor: '#085041',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#085041',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineBtnText: { color: '#085041', fontWeight: '600', fontSize: 13 },
  error: { color: '#C0392B', fontSize: 12, marginTop: 12 },
  success: { color: '#0A7C42', fontSize: 12, marginTop: 12 },
  versionRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    gap: 6,
  },
  versionMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  versionTitle: { fontSize: 12, fontWeight: '600', color: '#333', flex: 1 },
  statusBadge: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  activateBtn: {
    alignSelf: 'flex-start',
    backgroundColor: BRAND_PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activateBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  linkText: { fontSize: 11, color: BRAND_PRIMARY, fontWeight: '600' },
  moduleList: { marginVertical: 8, gap: 8 },
  moduleRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  moduleTitle: { fontSize: 13, fontWeight: '600', color: '#085041' },
  formRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  inputSmall: {
    width: 48,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#FAFAFC',
  },
  inputFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#FAFAFC',
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#FAFAFC',
  },
});
