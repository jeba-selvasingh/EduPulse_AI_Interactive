import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type StrengthWeight = 1 | 2 | 3;
export type CoCoverageStatus = 'adequate' | 'low' | 'missing';

export type QuestionCoPoMapping = {
  questionId: string;
  questionKey: string;
  moduleNumber: number;
  marks: number;
  coTag: string;
  poTag: string;
  strengthWeight: StrengthWeight;
  rationale: string;
  editedAt?: string | null;
  editedBy?: string | null;
};

export type CoCoverageEntry = {
  coTag: string;
  title: string;
  weightedScore: number;
  questionCount: number;
  coveragePct: number;
  status: CoCoverageStatus;
  isUnderRepresented: boolean;
};

export type PaperCoPoMapping = {
  paperId: string;
  courseCode: string;
  examType: string;
  generatedAt: string;
  generatedBy: string;
  questions: QuestionCoPoMapping[];
  coverage: CoCoverageEntry[];
  underRepresentedCount: number;
  readyForSubmit: boolean;
};

export type UpdateCoPoMappingResult = {
  mapping: QuestionCoPoMapping;
  coverage: CoCoverageEntry[];
  readyForSubmit: boolean;
};

export async function fetchPaperCoPoMapping(paperId: string): Promise<PaperCoPoMapping> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/co-po-mapping`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperCoPoMapping };
  return json.data;
}

export async function updateQuestionCoPoMapping(
  paperId: string,
  questionId: string,
  patch: { coTag?: string; poTag?: string; strengthWeight?: StrengthWeight },
): Promise<UpdateCoPoMappingResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/co-po-mapping/${encodeURIComponent(questionId)}`,
    {
      method: 'PUT',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: UpdateCoPoMappingResult };
  return json.data;
}
