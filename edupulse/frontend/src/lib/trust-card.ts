import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';
import type { AuditEvent } from '@/src/lib/audit-api';

export type TrustCardSource = {
  label: string;
  kind: string;
};

export type TrustCard = {
  id: string;
  artifactType: string;
  artifactLabel: string;
  modelName: string;
  promptVersion: string;
  confidence: number;
  blueprintCheckStatus: 'pass' | 'fail' | 'pending';
  sources: TrustCardSource[];
  auditTrail: AuditEvent[];
  verified: boolean;
};

export type SimilarityWarning = {
  similarityPct: number;
  matchedReference: string;
};

export type GeneratedQuestion = {
  id: string;
  questionKey: string;
  moduleNumber: number;
  moduleTitle: string;
  marks: number;
  bloomLevel: number;
  coTag: string;
  poTag: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  text: string;
  trustCardId: string;
  similarityWarning?: SimilarityWarning | null;
};

export type QuestionPaper = {
  id: string;
  courseCode: string;
  examType: string;
  syllabusVersionId: string;
  syllabusVersion: number;
  trustCardId: string;
  totalMarks: number;
  questionCount: number;
  durationMs: number;
  generatedAt: string;
  questions: GeneratedQuestion[];
};

export type PaperCraftGenerateResponse = {
  data: {
    status: string;
    message: string;
    paperId?: string;
    trustCardId?: string;
    artifactId?: string;
    questionCount?: number;
    durationMs?: number;
    totalMarks?: number;
    questions?: GeneratedQuestion[];
    syllabusVersionId?: string;
    syllabusVersion?: number;
  };
};

const SOURCE_ICONS: Record<string, string> = {
  pattern_profile: '🧬',
  syllabus: '📄',
  exemplar: '📌',
  evaluation: '📝',
  insight: '💡',
  other: '📎',
};

export function sourceIcon(kind: string): string {
  return SOURCE_ICONS[kind] ?? '📎';
}

export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

export function formatBlueprintStatus(status: TrustCard['blueprintCheckStatus']): string {
  if (status === 'pass') return 'Pass ✓';
  if (status === 'fail') return 'Fail ✗';
  return 'Pending';
}

export function formatAuditDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export async function fetchTrustCard(artifactId: string): Promise<TrustCard> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/trust-cards/${artifactId}`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Trust card fetch failed: ${response.status}`);
  }

  return response.json() as Promise<TrustCard>;
}
