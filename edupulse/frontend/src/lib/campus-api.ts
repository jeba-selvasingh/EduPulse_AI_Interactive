import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type CompanyTier = 'dream' | 'core_it' | 'mass';
export type TierFilter = 'all' | CompanyTier;
export type RegistrationStatus = 'open' | 'registered' | 'upcoming' | 'closed';
export type ReadinessTierId = 'dream' | 'core' | 'mass' | 'at_risk';

export type CompanyEligibility = {
  companyId: string;
  name: string;
  packageLpa: number;
  packageLabel: string;
  tier: CompanyTier;
  rulesSummary: string;
  driveDateLabel: string;
  registrationStatus: RegistrationStatus;
  registeredCount?: number;
  eligibleCount: number;
  notEligibleCount: number;
  nearMissCount: number;
};

export type NearMissInsight = {
  companyId: string;
  companyName: string;
  nearMissCount: number;
  cgpaGapLabel: string;
  message: string;
};

export type EligibilityTrackerView = {
  batchLabel: string;
  batchStrength: number;
  totalCompanies: number;
  activeTierFilter: TierFilter;
  companies: CompanyEligibility[];
  nearMissInsights: NearMissInsight[];
};

export type CampusHomeView = {
  batchLabel: string;
  batchStrength: number;
  dreamReadyCount: number;
  driveDaysLeft: number;
  offersReceived: number;
  companyCount: number;
  scheduledDrives: number;
  newCompaniesThisMonth: number;
  eligibilityRoute: string;
};

export type ReadinessWeights = {
  academics: number;
  coding: number;
  certs: number;
  communication: number;
};

export type TierSummary = {
  tier: ReadinessTierId;
  label: string;
  count: number;
  percent: number;
  barPercent: number;
  color: string;
};

export type ReadinessComponent = {
  key: keyof ReadinessWeights;
  label: string;
  score: number;
  maxScore: number;
  weight: number;
  weightedPoints: number;
};

export type StudentTierCard = {
  usn: string;
  name: string;
  cgpa: number;
  readinessPercent: number;
  tier: ReadinessTierId;
  tierLabel: string;
  eligibleCompanyCount: number;
  totalCompanies: number;
  gapSummary?: string;
  isAtRisk: boolean;
  detailRoute: string;
};

export type ReadinessTierBoardView = {
  batchLabel: string;
  departmentLabel: string;
  batchStrength: number;
  weights: ReadinessWeights;
  weightBounds: ReadinessWeights;
  weightCaption: string;
  tiers: TierSummary[];
  featuredStudents: StudentTierCard[];
  sampleBreakdown: ReadinessComponent[];
};

export type InterventionModuleLink = {
  id: string;
  label: string;
  route: string;
  priority?: 'urgent' | 'high' | 'medium' | 'quick_win';
};

export type StudentReadinessDetailView = {
  usn: string;
  name: string;
  departmentLabel: string;
  batchLabel: string;
  readinessPercent: number;
  tier: ReadinessTierId;
  tierLabel: string;
  trendLabel: string;
  breakdown: ReadinessComponent[];
  eligibleCompanyCount: number;
  totalCompanies: number;
  companyFitSummary: string;
  gapAnalysis: string;
  gapPlanTitle: string;
  gapPlanSummary: string;
  interventionModules: InterventionModuleLink[];
  evaluationRoute: string;
};

export type TrainingTrackId = 'aptitude' | 'soft_skills' | 'technical';

export type TrainingModuleMetric = {
  id: string;
  label: string;
  description: string;
  batchAvgPercent: number;
  targetPercent: number;
  statusLabel: string;
  statusTone: 'weak' | 'moderate' | 'good' | 'priority';
  isWeakestInTrack: boolean;
};

export type TrainingTrackSummary = {
  track: TrainingTrackId;
  title: string;
  subtitle: string;
  batchAvgPercent: number;
  batchAvgLabel: string;
  benchmarkPercent: number;
  benchmarkLabel: string;
  belowBenchmarkCount: number;
  gapSummary: string;
  modules: TrainingModuleMetric[];
  detailRoute: string;
  interventionRoute: string;
};

export type TrainingDashboardsView = {
  batchLabel: string;
  batchStrength: number;
  activeTrack: TrainingTrackId | null;
  tracks: TrainingTrackSummary[];
  weakestTrackId: TrainingTrackId;
  weakestTrackLabel: string;
  interventionPriorityRoute: string;
  interventionSummary: string;
};

export type DriveUrgencyTone = 'urgent' | 'attention' | 'normal' | 'upcoming';

export type DriveCalendarEntry = {
  driveId: string;
  companyName: string;
  driveDateLabel: string;
  daysUntilDrive: number;
  packageLabel: string;
  rulesSummary: string;
  scheduleNote?: string;
  venue?: string;
  registrationStatus: RegistrationStatus;
  eligibleCount: number;
  registeredCount: number;
  pendingCount: number;
  registrationOpensLabel?: string;
  registrationClosesLabel?: string;
  urgencyTone: DriveUrgencyTone;
  detailRoute: string;
};

export type DriveCalendarActionAlert = {
  driveId: string;
  companyName: string;
  message: string;
  pendingCount: number;
  registrationClosesLabel?: string;
};

export type DriveCalendarView = {
  monthLabel: string;
  batchLabel: string;
  whatsappPilotEnabled: boolean;
  drives: DriveCalendarEntry[];
  actionAlert?: DriveCalendarActionAlert;
};

export type UnregisteredEligibleStudent = {
  usn: string;
  name: string;
  cgpa: number;
};

export type DriveCalendarDetail = DriveCalendarEntry & {
  rules: {
    minCgpa: number;
    maxActiveBacklogs: number;
    maxEverBacklogs?: number;
    minCodingScore?: number;
    preferredCerts?: string[];
  };
  unregisteredEligibleCount: number;
  unregisteredEligibleStudents: UnregisteredEligibleStudent[];
  whatsappPilotEnabled: boolean;
  canSendReminder: boolean;
};

export type DriveReminderResult = {
  queued: boolean;
  driveId: string;
  companyName: string;
  recipientCount: number;
  queueId: string;
  channel: 'whatsapp';
  templateId: string;
  auditLogAction: string;
};

export type ReportGapSeverity = 'high' | 'medium' | 'critical';

export type ReportTierRow = {
  tier: ReadinessTierId;
  label: string;
  count: number;
  percent: number;
  barPercent: number;
  color: string;
};

export type ReportGapRow = {
  id: string;
  label: string;
  studentCount: number;
  severity: ReportGapSeverity;
  countLabel: string;
};

export type ReportDepartmentRow = {
  department: string;
  readinessPercent: number;
  barPercent: number;
  color: string;
};

export type RecoveryForecast = {
  currentPlacementPercent: number;
  projectedPlacementPercent: number;
  atRiskToCoreCount: number;
  summary: string;
};

export type BatchReadinessReportView = {
  reportTitle: string;
  batchLabel: string;
  batchStrength: number;
  generatedAt: string;
  tierDistribution: ReportTierRow[];
  topGaps: ReportGapRow[];
  departmentReadiness: ReportDepartmentRow[];
  recoveryForecast: RecoveryForecast;
  interventionPriorityRoute: string;
};

export type BatchReadinessExportFormat = 'pdf' | 'excel';

export type BatchReadinessExportResult = {
  format: BatchReadinessExportFormat;
  fileName: string;
  mimeType: string;
  base64: string;
  exportedAt: string;
  exportedBy: string;
  exportedByName: string;
};

export type InterventionUrgency = 'urgent' | 'high' | 'medium' | 'quick_win';
export type InterventionCompletionStatus = 'not_started' | 'in_progress' | 'completed';
export type InterventionFocus =
  | 'all'
  | 'backlog'
  | 'aptitude'
  | 'soft_skills'
  | 'technical'
  | 'certification';

export type InterventionItem = {
  id: string;
  rank: number;
  title: string;
  cohortSize: number;
  urgency: InterventionUrgency;
  urgencyLabel: string;
  description: string;
  owner: string;
  focusTags: string[];
  completionStatus: InterventionCompletionStatus;
  completionPercent?: number;
  completionNote?: string;
};

export type InterventionRecoveryForecast = {
  currentPlacementPercent: number;
  projectedPlacementPercent: number;
  additionalOffers: number;
  summary: string;
};

export type InterventionPriorityView = {
  batchLabel: string;
  activeFocus: InterventionFocus;
  availableFocuses: Array<{ id: InterventionFocus; label: string }>;
  interventions: InterventionItem[];
  recoveryForecast: InterventionRecoveryForecast;
};

export type InterventionCompletionUpdate = {
  status: InterventionCompletionStatus;
  completionPercent?: number;
  completionNote?: string;
};

export type MockTestStatus = 'done' | 'upcoming' | 'open' | 'scheduled' | 'grading';

export type MockTestEntry = {
  mockId: string;
  mockNumber: number;
  title: string;
  dateLabel: string;
  patternLabel: string;
  status: MockTestStatus;
  statusLabel: string;
  description: string;
  durationMinutes?: number;
  registeredCount?: number;
  participantsCount?: number;
  batchAvgScore?: number;
  aboveBenchmarkCount?: number;
  topScorerName?: string;
  topScorerScore?: number;
  registrationDeadlineLabel?: string;
  canRegister?: boolean;
  highlighted?: boolean;
};

export type MockTestNext = {
  mockId: string;
  title: string;
  scheduleLabel: string;
  description: string;
  autoGraded: boolean;
  resultsSlaHours: number;
};

export type MockTestTrendPoint = {
  label: string;
  batchAvgScore: number;
  barPercent: number;
  color: string;
};

export type MockTestScheduleView = {
  batchLabel: string;
  monthLabel: string;
  nextMock: MockTestNext;
  schedule: MockTestEntry[];
  scoreTrend: MockTestTrendPoint[];
};

export type MockTestDetail = MockTestEntry & {
  sections?: string[];
  benchmarkScore?: number;
  gradingStatus?: 'not_started' | 'in_progress' | 'completed';
  gradingCompletedInMinutes?: number;
  gradingWithinSla?: boolean;
};

export type MockTestGradingResult = {
  mockId: string;
  submittedCount: number;
  gradedCount: number;
  batchAvgScore: number;
  gradingCompletedInMinutes: number;
  gradingWithinSla: boolean;
  resultsSlaHours: number;
  auditLogAction: string;
};

export type ScheduleMockTestInput = {
  patternLabel: string;
  dateLabel: string;
  focus?: string;
  durationMinutes?: number;
  sections?: string[];
};

export async function fetchCampusHome(): Promise<CampusHomeView> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/home`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Campus home fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: CampusHomeView };
  return payload.data;
}

export async function fetchEligibilityTracker(tier: TierFilter = 'all'): Promise<EligibilityTrackerView> {
  const base = getApiBaseUrl();
  const query = tier === 'all' ? '' : `?tier=${encodeURIComponent(tier)}`;
  const response = await fetch(`${base}/api/campus-drive/eligibility${query}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Eligibility tracker fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: EligibilityTrackerView };
  return payload.data;
}

export async function fetchReadinessBoard(): Promise<ReadinessTierBoardView> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/readiness-board`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Readiness board fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ReadinessTierBoardView };
  return payload.data;
}

export async function updateReadinessWeights(weights: ReadinessWeights): Promise<ReadinessWeights> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/readiness-weights`, {
    method: 'PATCH',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(weights),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Readiness weights update failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ReadinessWeights };
  return payload.data;
}

export async function fetchStudentReadiness(usn: string): Promise<StudentReadinessDetailView> {
  const base = getApiBaseUrl();
  const response = await fetch(
    `${base}/api/campus-drive/student-readiness?usn=${encodeURIComponent(usn)}`,
    { headers: await getApiHeaders() },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Student readiness fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: StudentReadinessDetailView };
  return payload.data;
}

export async function fetchTrainingDashboards(
  track?: string,
): Promise<TrainingDashboardsView> {
  const base = getApiBaseUrl();
  const query = track ? `?track=${encodeURIComponent(track)}` : '';
  const response = await fetch(`${base}/api/campus-drive/training-dashboards${query}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Training dashboards fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: TrainingDashboardsView };
  return payload.data;
}

export async function fetchDriveCalendar(): Promise<DriveCalendarView> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/drive-calendar`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Drive calendar fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: DriveCalendarView };
  return payload.data;
}

export async function fetchDriveCalendarDetail(driveId: string): Promise<DriveCalendarDetail> {
  const base = getApiBaseUrl();
  const response = await fetch(
    `${base}/api/campus-drive/drive-calendar?driveId=${encodeURIComponent(driveId)}`,
    { headers: await getApiHeaders() },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Drive calendar detail fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: DriveCalendarDetail };
  return payload.data;
}

export async function queueDriveReminder(driveId: string): Promise<DriveReminderResult> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/drive-calendar/reminders`, {
    method: 'POST',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ driveId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Drive reminder queue failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: DriveReminderResult };
  return payload.data;
}

export async function fetchBatchReadinessReport(): Promise<BatchReadinessReportView> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/batch-readiness-report`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Batch readiness report fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: BatchReadinessReportView };
  return payload.data;
}

export async function exportBatchReadinessReport(
  format: BatchReadinessExportFormat,
): Promise<BatchReadinessExportResult> {
  const base = getApiBaseUrl();
  const response = await fetch(
    `${base}/api/campus-drive/batch-readiness-report/export?format=${encodeURIComponent(format)}`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Batch readiness export failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: BatchReadinessExportResult };
  return payload.data;
}

export function downloadBatchReadinessExport(exportFile: BatchReadinessExportResult): void {
  if (typeof document === 'undefined') {
    return;
  }

  const byteCharacters = atob(exportFile.base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: exportFile.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = exportFile.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function fetchInterventionPriority(
  focus?: string,
): Promise<InterventionPriorityView> {
  const base = getApiBaseUrl();
  const query = focus ? `?focus=${encodeURIComponent(focus)}` : '';
  const response = await fetch(`${base}/api/campus-drive/intervention-priority${query}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Intervention priority fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: InterventionPriorityView };
  return payload.data;
}

export async function updateInterventionCompletion(
  interventionId: string,
  update: InterventionCompletionUpdate,
): Promise<InterventionItem> {
  const base = getApiBaseUrl();
  const response = await fetch(
    `${base}/api/campus-drive/intervention-priority/${encodeURIComponent(interventionId)}/completion`,
    {
      method: 'PATCH',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Intervention completion update failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: InterventionItem };
  return payload.data;
}

export function interventionUrgencyStyle(urgency: InterventionUrgency): {
  backgroundColor: string;
  borderColor: string;
  pillBackground: string;
  pillColor: string;
} {
  switch (urgency) {
    case 'urgent':
      return {
        backgroundColor: '#FFF5F5',
        borderColor: '#F5C2C2',
        pillBackground: '#FDE8E8',
        pillColor: '#9B1C1C',
      };
    case 'high':
      return {
        backgroundColor: '#FFF5F5',
        borderColor: '#F5C2C2',
        pillBackground: '#FDE8E8',
        pillColor: '#9B1C1C',
      };
    case 'quick_win':
      return {
        backgroundColor: '#F6F4FF',
        borderColor: '#D4CFF7',
        pillBackground: '#EEEDFE',
        pillColor: '#3C3489',
      };
    default:
      return {
        backgroundColor: '#FFFBF2',
        borderColor: '#F5DFB8',
        pillBackground: '#FFF4E5',
        pillColor: '#8A5A00',
      };
  }
}

export function interventionCompletionLabel(status: InterventionCompletionStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    default:
      return 'Not started';
  }
}

export async function fetchMockTestSchedule(): Promise<MockTestScheduleView> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/mock-tests`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Mock test schedule fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: MockTestScheduleView };
  return payload.data;
}

export async function fetchMockTestDetail(mockId: string): Promise<MockTestDetail> {
  const base = getApiBaseUrl();
  const response = await fetch(
    `${base}/api/campus-drive/mock-tests?mockId=${encodeURIComponent(mockId)}`,
    { headers: await getApiHeaders() },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Mock test detail fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: MockTestDetail };
  return payload.data;
}

export async function scheduleMockTest(input: ScheduleMockTestInput): Promise<MockTestDetail> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/campus-drive/mock-tests`, {
    method: 'POST',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Mock test schedule failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: MockTestDetail };
  return payload.data;
}

export async function registerForMockTest(
  mockId: string,
): Promise<{ mockId: string; registeredCount: number; registrationDeadlineLabel?: string }> {
  const base = getApiBaseUrl();
  const response = await fetch(
    `${base}/api/campus-drive/mock-tests/${encodeURIComponent(mockId)}/register`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Mock test registration failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data: { mockId: string; registeredCount: number; registrationDeadlineLabel?: string };
  };
  return payload.data;
}

export async function submitMockTestObjectives(
  mockId: string,
  submittedCount?: number,
): Promise<MockTestGradingResult> {
  const base = getApiBaseUrl();
  const response = await fetch(
    `${base}/api/campus-drive/mock-tests/${encodeURIComponent(mockId)}/submissions`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submittedCount ? { submittedCount } : {}),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Mock test submission failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: MockTestGradingResult };
  return payload.data;
}

export function mockTestStatusStyle(status: MockTestStatus): {
  backgroundColor: string;
  color: string;
} {
  switch (status) {
    case 'done':
      return { backgroundColor: '#E1F5EE', color: '#085041' };
    case 'upcoming':
      return { backgroundColor: '#EEEDFE', color: '#3C3489' };
    case 'grading':
      return { backgroundColor: '#FFF4E5', color: '#8A5A00' };
    default:
      return { backgroundColor: '#E6F1FB', color: '#185FA5' };
  }
}

export function reportGapSeverityStyle(severity: ReportGapSeverity): {
  backgroundColor: string;
  color: string;
} {
  switch (severity) {
    case 'critical':
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C' };
    case 'high':
      return { backgroundColor: '#FFF4E5', color: '#8A5A00' };
    default:
      return { backgroundColor: '#EEEDFE', color: '#3C3489' };
  }
}

export function driveUrgencyToneStyle(tone: DriveUrgencyTone): {
  backgroundColor: string;
  color: string;
  label: string;
} {
  switch (tone) {
    case 'urgent':
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C', label: `${tone}` };
    case 'attention':
      return { backgroundColor: '#FFF4E5', color: '#8A5A00', label: `${tone}` };
    case 'upcoming':
      return { backgroundColor: '#EEEDFE', color: '#3C3489', label: `${tone}` };
    default:
      return { backgroundColor: '#E6F1FB', color: '#185FA5', label: `${tone}` };
  }
}

export function trainingModuleToneStyle(tone: TrainingModuleMetric['statusTone']): {
  backgroundColor: string;
  color: string;
  barColor: string;
} {
  switch (tone) {
    case 'good':
      return { backgroundColor: '#E1F5EE', color: '#085041', barColor: '#5DCAA5' };
    case 'priority':
      return { backgroundColor: '#FFF4E5', color: '#8A5A00', barColor: '#FAC775' };
    case 'weak':
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C', barColor: '#FAC775' };
    default:
      return { backgroundColor: '#EEEDFE', color: '#3C3489', barColor: '#AFA9EC' };
  }
}

export function tierFilterLabel(tier: TierFilter): string {
  switch (tier) {
    case 'dream':
      return 'Dream';
    case 'core_it':
      return 'Core IT';
    case 'mass':
      return 'Mass';
    default:
      return 'All';
  }
}

export function readinessTierPillStyle(tier: ReadinessTierId): {
  backgroundColor: string;
  color: string;
} {
  switch (tier) {
    case 'dream':
      return { backgroundColor: '#E1F5EE', color: '#085041' };
    case 'core':
      return { backgroundColor: '#E6F1FB', color: '#185FA5' };
    case 'mass':
      return { backgroundColor: '#FFF4E5', color: '#854F0B' };
    default:
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C' };
  }
}

export function registrationPillStyle(status: RegistrationStatus): {
  backgroundColor: string;
  color: string;
  label: string;
} {
  switch (status) {
    case 'open':
      return { backgroundColor: '#FFF4E5', color: '#8A5A00', label: 'Registration open' };
    case 'registered':
      return { backgroundColor: '#E1F5EE', color: '#085041', label: 'Registered' };
    case 'upcoming':
      return { backgroundColor: '#EEEDFE', color: '#3C3489', label: 'Upcoming' };
    default:
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C', label: 'Closed' };
  }
}

export function eligibleCountStyle(eligibleCount: number, batchStrength: number): {
  backgroundColor: string;
  color: string;
} {
  const ratio = eligibleCount / batchStrength;
  if (ratio >= 0.85) {
    return { backgroundColor: '#E1F5EE', color: '#085041' };
  }
  if (ratio >= 0.5) {
    return { backgroundColor: '#FFF4E5', color: '#8A5A00' };
  }
  return { backgroundColor: '#FDE8E8', color: '#9B1C1C' };
}
