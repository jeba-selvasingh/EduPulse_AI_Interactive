import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type NepCompetency = 'Foundational' | 'Developing' | 'Proficient' | 'Advanced';
export type CompetencyTrend = 'up' | 'stable' | 'down';

export type AcademicSubject = {
  courseCode: string;
  courseName: string;
  competency: NepCompetency;
  highestBloomLevel: number;
  trend: CompetencyTrend;
  trendWarning: boolean;
  summary: string;
  hasPublishedMarks: boolean;
  diagnosisRoute: string;
};

export type AcademicLevelView = {
  usn: string;
  studentName: string;
  subjects: AcademicSubject[];
  ladderCaption: string;
};

export async function fetchAcademicLevel(usn?: string): Promise<AcademicLevelView> {
  const base = getApiBaseUrl();
  const query = usn ? `?usn=${encodeURIComponent(usn)}` : '';
  const response = await fetch(`${base}/api/diagnosis/academic-level${query}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Academic level fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: AcademicLevelView };
  return payload.data;
}

export function trendArrow(trend: CompetencyTrend): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

export function competencyPillStyle(competency: NepCompetency): {
  backgroundColor: string;
  color: string;
} {
  switch (competency) {
    case 'Proficient':
      return { backgroundColor: '#E1F5EE', color: '#085041' };
    case 'Developing':
      return { backgroundColor: '#FFF4E5', color: '#8A5A00' };
    case 'Advanced':
      return { backgroundColor: '#EEEDFE', color: '#3C3489' };
    default:
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C' };
  }
}

export type ConceptMasteryBand = 'green' | 'amber' | 'red' | 'missing';
export type BloomLevelStatus = 'pass' | 'fail' | 'untested';

export type ConceptMastery = {
  conceptId: string;
  name: string;
  masteryPercent: number | null;
  isWeak: boolean;
  band: ConceptMasteryBand;
  bloomLevel?: number;
  evidence?: string;
};

export type ConceptDiagnosisMap = {
  usn: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  examType: string;
  focusCoTag?: string;
  concepts: ConceptMastery[];
  bloomStrip: {
    levels: Array<{ level: number; status: BloomLevelStatus }>;
    caption: string;
  };
  aiDiagnosis: {
    summary: string;
    evidenceRefs: string[];
    trustCardId?: string;
  };
  examEvidenceRoute: string;
};

export async function fetchConceptDiagnosisMap(
  courseCode: string,
  options?: { usn?: string; examType?: string; coTag?: string },
): Promise<ConceptDiagnosisMap> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (options?.usn) params.set('usn', options.usn);
  if (options?.examType) params.set('examType', options.examType);
  if (options?.coTag) params.set('coTag', options.coTag);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`${base}/api/diagnosis/concept-map/${courseCode}${query}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Concept map fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ConceptDiagnosisMap };
  return payload.data;
}

export function masteryBarColor(band: ConceptMasteryBand): string {
  switch (band) {
    case 'green':
      return '#5DCAA5';
    case 'amber':
      return '#FAC775';
    case 'red':
      return '#F09595';
    default:
      return '#E2E8F0';
  }
}

export function masteryTextColor(band: ConceptMasteryBand): string {
  switch (band) {
    case 'green':
      return '#085041';
    case 'amber':
      return '#8A5A00';
    case 'red':
      return '#9B1C1C';
    default:
      return '#888';
  }
}

export function bloomStripColor(status: BloomLevelStatus): string {
  if (status === 'pass') return '#5DCAA5';
  if (status === 'fail') return '#F09595';
  return '#f0ede8';
}

export type ExamQuestionEvidence = {
  questionId: string;
  label: string;
  topic: string;
  bloomLevel: number;
  marksAwarded: number;
  maxMarks: number;
  classAverageMarks: number;
  rubricFeedback: string;
  isWeak: boolean;
  improvementRoute: string;
};

export type ExamEvidenceView = {
  usn: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  examType: string;
  isPublished: boolean;
  totalMarks: number;
  maxTotalMarks: number;
  questions: ExamQuestionEvidence[];
  summary: {
    classAverageTotal: number;
    studentTotal: number;
    maxTotalMarks: number;
    deltaFromClassAverage: number;
    insight: string;
  };
  improvementPlanRoute: string;
};

export async function fetchExamEvidence(
  courseCode: string,
  examType: string,
  usn?: string,
): Promise<ExamEvidenceView> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (usn) params.set('usn', usn);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(
    `${base}/api/diagnosis/exam-evidence/${courseCode}/${encodeURIComponent(examType)}${query}`,
    { headers: await getApiHeaders() },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Exam evidence fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ExamEvidenceView };
  return payload.data;
}

export function questionScoreColor(marksAwarded: number, maxMarks: number, isWeak: boolean): string {
  if (isWeak) return '#9B1C1C';
  const percent = maxMarks > 0 ? (marksAwarded / maxMarks) * 100 : 0;
  if (percent >= 70) return '#085041';
  if (percent >= 40) return '#8A5A00';
  return '#9B1C1C';
}

export type ImprovementPriority = 'high' | 'medium' | 'watch';
export type MilestoneStatus = 'done' | 'now' | 'next';

export type FacultyAttribution = {
  facultyName: string;
  editedAt: string;
  description: string;
};

export type ImprovementArea = {
  itemId: string;
  rank: number;
  title: string;
  priority: ImprovementPriority;
  impactSummary: string;
  coTagsAffected?: string[];
  companiesImpact?: number;
  impactScore: number;
  isFocused: boolean;
  facultyAttribution?: FacultyAttribution;
};

export type PlanMilestone = {
  itemId: string;
  weekLabel: string;
  title: string;
  status: MilestoneStatus;
  description: string;
  facultyAttribution?: FacultyAttribution;
};

export type ImprovementPlanView = {
  usn: string;
  studentName: string;
  focusQuestionId?: string;
  courseCode?: string;
  rankedAreas: ImprovementArea[];
  rankCaption: string;
  milestones: PlanMilestone[];
  completionPercent: number;
  currentWeekLabel: string;
  eightWeekPlanRoute: string;
  progressRoute: string;
  placementInsight: string;
};

export async function fetchImprovementPlan(options?: {
  usn?: string;
  courseCode?: string;
  questionId?: string;
  examType?: string;
}): Promise<ImprovementPlanView> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (options?.usn) params.set('usn', options.usn);
  if (options?.courseCode) params.set('courseCode', options.courseCode);
  if (options?.questionId) params.set('questionId', options.questionId);
  if (options?.examType) params.set('examType', options.examType);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`${base}/api/diagnosis/improvement-plan${query}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Improvement plan fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ImprovementPlanView };
  return payload.data;
}

export async function updateImprovementItem(
  itemId: string,
  usn: string,
  description: string,
): Promise<ImprovementPlanView> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/diagnosis/improvement-plan/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ usn, description }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Improvement item update failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ImprovementPlanView };
  return payload.data;
}

export function priorityPillStyle(priority: ImprovementPriority): {
  backgroundColor: string;
  color: string;
  label: string;
} {
  switch (priority) {
    case 'high':
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C', label: 'High priority' };
    case 'medium':
      return { backgroundColor: '#FFF4E5', color: '#8A5A00', label: 'Medium' };
    default:
      return { backgroundColor: '#E1F5EE', color: '#085041', label: 'Watch' };
  }
}

export function milestoneStatusStyle(status: MilestoneStatus): {
  backgroundColor: string;
  color: string;
  label: string;
} {
  switch (status) {
    case 'done':
      return { backgroundColor: '#E1F5EE', color: '#085041', label: 'Done' };
    case 'now':
      return { backgroundColor: '#EEEDFE', color: '#3C3489', label: 'Now' };
    default:
      return { backgroundColor: '#E1F5EE', color: '#085041', label: 'Next' };
  }
}

export function areaCardStyle(priority: ImprovementPriority, isFocused: boolean) {
  if (isFocused) return { backgroundColor: '#FFF5F5', borderColor: '#F09595' };
  if (priority === 'high') return { backgroundColor: '#FFF5F5', borderColor: '#FDE8E8' };
  if (priority === 'medium') return { backgroundColor: '#FFFBF5', borderColor: '#FFF4E5' };
  return { backgroundColor: '#FFF', borderColor: '#E2E8F0' };
}

export type ProgressTrend = 'up' | 'stable' | 'down';
export type ReadinessTrendLabel = 'improving' | 'stable' | 'declining';

export type ReadinessPoint = {
  label: string;
  sublabel: string;
  score: number;
  barHeightPercent: number;
  color: string;
};

export type ConceptDelta = {
  conceptName: string;
  fromScore: number;
  toScore: number;
  trend: ProgressTrend;
  deltaLabel: string;
};

export type ProgressTrackingView = {
  usn: string;
  studentName: string;
  readinessTrendLabel: ReadinessTrendLabel;
  readinessPoints: ReadinessPoint[];
  conceptDeltas: ConceptDelta[];
  companiesEligibility: {
    fromCount: number;
    toCount: number;
    trend: ProgressTrend;
    deltaLabel: string;
  };
  projection: {
    summary: string;
    assumptions: string[];
  };
  dataPointCount: number;
};

export async function fetchProgressTracking(usn?: string): Promise<ProgressTrackingView> {
  const base = getApiBaseUrl();
  const query = usn ? `?usn=${encodeURIComponent(usn)}` : '';

  const response = await fetch(`${base}/api/diagnosis/progress-tracking${query}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Progress tracking fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ProgressTrackingView };
  return payload.data;
}

export function trendLabelStyle(trend: ReadinessTrendLabel): {
  backgroundColor: string;
  color: string;
  label: string;
} {
  switch (trend) {
    case 'improving':
      return { backgroundColor: '#E1F5EE', color: '#085041', label: '↑ improving' };
    case 'declining':
      return { backgroundColor: '#FDE8E8', color: '#9B1C1C', label: '↓ declining' };
    default:
      return { backgroundColor: '#EDF2F7', color: '#4A5568', label: '→ stable' };
  }
}

export function deltaTextColor(trend: ProgressTrend): string {
  if (trend === 'up') return '#085041';
  if (trend === 'down') return '#9B1C1C';
  return '#8A5A00';
}
