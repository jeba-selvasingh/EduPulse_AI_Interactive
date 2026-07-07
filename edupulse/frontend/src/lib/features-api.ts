import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';
import type { InstitutionPulseView } from '@/src/lib/dean-pulse-api';
import type { PaperCraftModule, SyllabusGenerationWarning } from '@/src/lib/syllabus-api';
import type { PaperCraftGenerateResponse, GeneratedQuestion, QuestionPaper } from '@/src/lib/trust-card';

export type PaperCraftGenerateOptions = {
  courseCode?: string;
  syllabusVersionId?: string;
  acknowledgeSuperseded?: boolean;
  questionCount?: number;
};

export async function fetchDeanPulse(): Promise<{ data: InstitutionPulseView }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/dean-pulse`, {
    headers: await getApiHeaders(),
  });

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<{ data: InstitutionPulseView }>;
}

export async function fetchPaperCraftModules(courseCode: string): Promise<PaperCraftModule[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/modules/${encodeURIComponent(courseCode)}`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: PaperCraftModule[] };
  return json.data;
}

export async function requestPaperCraftGenerate(
  options: PaperCraftGenerateOptions = {},
): Promise<PaperCraftGenerateResponse> {
  const baseUrl = getApiBaseUrl();
  const courseCode = options.courseCode ?? 'BCS304';
  const response = await fetch(`${baseUrl}/api/paper-craft/generate`, {
    method: 'POST',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      courseCode,
      syllabusVersionId: options.syllabusVersionId,
      acknowledgeSuperseded: options.acknowledgeSuperseded,
      questionCount: options.questionCount,
    }),
  });

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }

  if (response.status === 409) {
    const body = (await response.json()) as
      | SyllabusGenerationWarning
      | { message?: SyllabusGenerationWarning | string };
    const warning =
      'code' in body && body.code === 'SUPERSEDED_SYLLABUS'
        ? body
        : typeof body.message === 'object' && body.message?.code === 'SUPERSEDED_SYLLABUS'
          ? body.message
          : undefined;
    const err = new Error(warning?.message ?? 'Superseded syllabus') as Error & {
      paperCraftWarning?: SyllabusGenerationWarning;
    };
    err.paperCraftWarning = warning;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<PaperCraftGenerateResponse>;
}

export async function fetchGeneratedPaper(paperId: string): Promise<QuestionPaper> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: QuestionPaper };
  return json.data;
}

export type RegenerateQuestionResponse = {
  data: {
    paperId: string;
    question: GeneratedQuestion;
    questions: GeneratedQuestion[];
    flaggedCount: number;
  };
};

export async function regeneratePaperQuestion(
  paperId: string,
  questionId: string,
): Promise<RegenerateQuestionResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/questions/${encodeURIComponent(questionId)}/regenerate`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<RegenerateQuestionResponse>;
}
