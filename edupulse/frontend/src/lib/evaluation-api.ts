import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type EvaluationProgress = {
  uploaded: number;
  aiEvaluated: number;
  facultyReviewed: number;
};

export type EvaluationWorkflowDashboard = {
  courseCode: string;
  examType: string;
  paperId: string | null;
  available: boolean;
  moderationStatus?: 'draft' | 'submitted' | 'approved' | 'returned';
  message: string;
  totalStudents: number;
  questionCount?: number;
  totalMarks?: number;
  progress: EvaluationProgress;
  percentComplete: EvaluationProgress;
};

export async function fetchEvaluationDashboard(
  courseCode: string,
  examType: string,
  paperId?: string,
): Promise<EvaluationWorkflowDashboard> {
  const baseUrl = getApiBaseUrl();
  const query = paperId ? `?paperId=${encodeURIComponent(paperId)}` : '';
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/dashboard${query}`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: EvaluationWorkflowDashboard };
  return json.data;
}

export type SheetCaptureAnalyze = {
  captureId: string;
  cornersDetected: boolean;
  cornerWarning: string | null;
  usnDetected: string | null;
  usnConfidence: number | null;
  requiresManualUsn: boolean;
};

export type SheetCaptureConfirm = {
  captureId: string;
  usn: string;
  studentName: string;
  pageNumber: number;
  uploadedTotal: number;
};

const GOOD_CORNERS: [number, number][] = [
  [0.08, 0.1],
  [0.92, 0.1],
  [0.92, 0.9],
  [0.08, 0.9],
];

export function defaultCaptureCorners(): [number, number][] {
  return GOOD_CORNERS;
}

export async function analyzeSheetCapture(
  courseCode: string,
  examType: string,
  payload: { cornerPoints?: [number, number][]; headerText?: string },
  paperId?: string,
): Promise<SheetCaptureAnalyze> {
  const baseUrl = getApiBaseUrl();
  const query = paperId ? `?paperId=${encodeURIComponent(paperId)}` : '';
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/capture/analyze${query}`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: SheetCaptureAnalyze };
  return json.data;
}

export async function confirmSheetCapture(
  courseCode: string,
  examType: string,
  payload: { captureId: string; usn: string },
  paperId?: string,
): Promise<SheetCaptureConfirm> {
  const baseUrl = getApiBaseUrl();
  const query = paperId ? `?paperId=${encodeURIComponent(paperId)}` : '';
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/capture/confirm${query}`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: SheetCaptureConfirm };
  return json.data;
}

export type BulkUploadMappedFile = {
  fileName: string;
  usn: string;
  studentName: string;
  estimatedDpi: number;
  lowDpiWarning: string | null;
};

export type BulkUploadSummary = {
  fileName: string;
  kind: 'pdf' | 'zip';
  byteLength: number;
  acceptedCount: number;
  rejectedCount: number;
  usnMismatches: Array<{ fileName: string; message: string }>;
  qualityWarnings: Array<{ fileName: string; message: string }>;
  mapped: BulkUploadMappedFile[];
  uploadedTotal: number;
};

export type BulkUploadSample = {
  fileName: string;
  instructions: string;
  entries: Array<{ fileName: string; estimatedDpi: number; studentName: string }>;
};

export async function fetchBulkUploadSample(
  courseCode: string,
  examType: string,
): Promise<BulkUploadSample> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/bulk/sample`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: BulkUploadSample };
  return json.data;
}

export async function uploadBulkSheets(
  courseCode: string,
  examType: string,
  payload: {
    fileName: string;
    base64?: string;
    byteLength?: number;
    estimatedDpi?: number;
    entries?: Array<{ fileName: string; base64?: string; estimatedDpi?: number }>;
  },
  paperId?: string,
): Promise<BulkUploadSummary> {
  const baseUrl = getApiBaseUrl();
  const query = paperId ? `?paperId=${encodeURIComponent(paperId)}` : '';
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/bulk/upload${query}`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { message?: string | { message?: string } }
      | null;
    const message =
      typeof err?.message === 'string'
        ? err.message
        : typeof err?.message === 'object' && err?.message?.message
          ? err.message.message
          : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  const json = (await response.json()) as { data: BulkUploadSummary };
  return json.data;
}

export type QuestionEvaluation = {
  questionId: string;
  questionKey: string;
  maxMarks: number;
  marksAwarded: number;
  aiMarksAwarded: number;
  rationale: string;
  confidence: number;
  flaggedForReview: boolean;
  reviewStatus: 'pending' | 'accepted' | 'overridden' | 'waived';
  facultyNote?: string | null;
  reviewedAt?: string | null;
  trustCardId: string;
};

export type SheetEvaluation = {
  usn: string;
  studentName: string;
  courseCode: string;
  examType: string;
  paperId: string | null;
  totalMarks: number;
  maxTotalMarks: number;
  durationMs: number;
  modelName: string;
  promptVersion: string;
  trustCardId: string;
  questions: QuestionEvaluation[];
  flaggedQuestionCount: number;
  evaluatedAt: string;
};

export async function runSheetEvaluation(
  courseCode: string,
  examType: string,
  usn: string,
  paperId?: string,
): Promise<SheetEvaluation> {
  const baseUrl = getApiBaseUrl();
  const query = paperId ? `?paperId=${encodeURIComponent(paperId)}` : '';
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/evaluate/${encodeURIComponent(usn)}${query}`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { message?: string | { message?: string } }
      | null;
    const message =
      typeof err?.message === 'string'
        ? err.message
        : typeof err?.message === 'object' && err?.message?.message
          ? err.message.message
          : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  const json = (await response.json()) as { data: SheetEvaluation };
  return json.data;
}

export async function fetchSheetEvaluation(
  courseCode: string,
  examType: string,
  usn: string,
): Promise<SheetEvaluation> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/evaluate/${encodeURIComponent(usn)}`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (response.status === 404) throw new Error('NOT_FOUND');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: SheetEvaluation };
  return json.data;
}

export type FlaggedReviewItem = {
  usn: string;
  studentName: string;
  questionId: string;
  questionKey: string;
  maxMarks: number;
  marksAwarded: number;
  aiMarksAwarded: number;
  rationale: string;
  confidence: number;
  reviewStatus: 'pending' | 'accepted' | 'overridden' | 'waived';
  trustCardId: string;
};

export type FacultyReviewDetail = FlaggedReviewItem & {
  scannedSnippet: string;
  snippetCaption: string;
  facultyNote?: string | null;
};

export async function fetchFlaggedReviews(
  courseCode: string,
  examType: string,
): Promise<FlaggedReviewItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/review/flagged`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: FlaggedReviewItem[] };
  return json.data;
}

export async function fetchFacultyReviewDetail(
  courseCode: string,
  examType: string,
  usn: string,
  questionId: string,
): Promise<FacultyReviewDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/review/${encodeURIComponent(usn)}/${encodeURIComponent(questionId)}`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: FacultyReviewDetail };
  return json.data;
}

export async function acceptFacultyReview(
  courseCode: string,
  examType: string,
  usn: string,
  questionId: string,
): Promise<FacultyReviewDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/review/${encodeURIComponent(usn)}/${encodeURIComponent(questionId)}/accept`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: FacultyReviewDetail };
  return json.data;
}

export async function overrideFacultyReview(
  courseCode: string,
  examType: string,
  usn: string,
  questionId: string,
  payload: { marksAwarded: number; facultyNote: string },
): Promise<FacultyReviewDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/review/${encodeURIComponent(usn)}/${encodeURIComponent(questionId)}/override`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { message?: string | { message?: string } }
      | null;
    const message =
      typeof err?.message === 'string'
        ? err.message
        : typeof err?.message === 'object' && err?.message?.message
          ? err.message.message
          : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  const json = (await response.json()) as { data: FacultyReviewDetail };
  return json.data;
}

export type ScoreDistributionBucket = {
  band: string;
  label: string;
  count: number;
  percent: number;
};

export type QuestionAverage = {
  questionId: string;
  questionKey: string;
  topic: string;
  averageMarks: number;
  maxMarks: number;
  averagePercent: number;
};

export type WeakestQuestionInsight = {
  questionId: string;
  questionKey: string;
  topic: string;
  averageMarks: number;
  maxMarks: number;
  thresholdMarks: number;
  belowThresholdCount: number;
  mappedCoTag: string | null;
};

export type BatchEvaluationInsights = {
  courseCode: string;
  examType: string;
  totalStudents: number;
  evaluatedCount: number;
  approvedCount: number;
  inReviewCount: number;
  pendingCount: number;
  scoreDistribution: ScoreDistributionBucket[];
  questionAverages: QuestionAverage[];
  weakestQuestion: WeakestQuestionInsight | null;
  insightMessage: string;
};

export type HeatmapRefreshResult = {
  courseCode: string;
  examType: string;
  importedCells: number;
  heatmapStudentsWithMarks: number;
  highlightedClusters: number;
  weakestCoTag: string | null;
  insightMessage: string;
};

export async function fetchBatchInsights(
  courseCode: string,
  examType: string,
): Promise<BatchEvaluationInsights> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/batch/insights`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: BatchEvaluationInsights };
  return json.data;
}

export async function refreshBatchHeatmap(
  courseCode: string,
  examType: string,
): Promise<HeatmapRefreshResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/batch/refresh-heatmap`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: HeatmapRefreshResult };
  return json.data;
}

export type PendingReviewItem = {
  usn: string;
  studentName: string;
  questionId: string;
  questionKey: string;
};

export type PublishStatus = {
  courseCode: string;
  examType: string;
  evaluatedCount: number;
  canPublish: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  source: 'evaluation_ai' | 'manual' | null;
  pendingReviews: PendingReviewItem[];
  message: string;
};

export type PublishMarksResult = {
  status: 'published';
  batchId: string;
  courseCode: string;
  examType: string;
  importedCells: number;
  publishedStudents: number;
  publishedAt: string;
  source: 'evaluation_ai';
  message: string;
};

export async function fetchPublishStatus(
  courseCode: string,
  examType: string,
): Promise<PublishStatus> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/publish/status`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PublishStatus };
  return json.data;
}

export async function publishEvaluatedMarks(
  courseCode: string,
  examType: string,
): Promise<PublishMarksResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/publish`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { message?: string | { message?: string; pendingReviews?: PendingReviewItem[] } }
      | null;
    const nested = typeof err?.message === 'object' ? err.message : null;
    const message =
      typeof err?.message === 'string'
        ? err.message
        : nested?.message
          ? nested.message
          : `Request failed: ${response.status}`;
    const error = new Error(message) as Error & { pendingReviews?: PendingReviewItem[] };
    if (nested?.pendingReviews) error.pendingReviews = nested.pendingReviews;
    throw error;
  }

  const json = (await response.json()) as { data: PublishMarksResult };
  return json.data;
}

export async function waiveFacultyReview(
  courseCode: string,
  examType: string,
  usn: string,
  questionId: string,
  payload: { waiverReason: string },
): Promise<FacultyReviewDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/evaluation/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/review/${encodeURIComponent(usn)}/${encodeURIComponent(questionId)}/waive`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: FacultyReviewDetail };
  return json.data;
}
