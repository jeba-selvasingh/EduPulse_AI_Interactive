import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type RubricMarkStep = {
  label: string;
  marks: number;
};

export type QuestionAnswerKey = {
  questionId: string;
  questionKey: string;
  maxMarks: number;
  modelAnswer: string;
  rubricSteps: RubricMarkStep[];
  trustCardId: string;
  rubricTotal: number;
  isValid: boolean;
  editedAt?: string | null;
  editedBy?: string | null;
};

export type PaperAnswerKey = {
  paperId: string;
  courseCode: string;
  examType: string;
  generatedAt: string;
  generatedBy: string;
  questions: QuestionAnswerKey[];
};

export async function generatePaperAnswerKey(paperId: string): Promise<PaperAnswerKey> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/answer-key/generate`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperAnswerKey };
  return json.data;
}

export async function fetchPaperAnswerKey(paperId: string): Promise<PaperAnswerKey> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/answer-key`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (response.status === 404) throw new Error('NOT_FOUND');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperAnswerKey };
  return json.data;
}

export async function fetchQuestionAnswerKey(
  paperId: string,
  questionId: string,
): Promise<QuestionAnswerKey> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/answer-key/${encodeURIComponent(questionId)}`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: QuestionAnswerKey };
  return json.data;
}

export async function updateQuestionModelAnswer(
  paperId: string,
  questionId: string,
  modelAnswer: string,
): Promise<QuestionAnswerKey> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/answer-key/${encodeURIComponent(questionId)}`,
    {
      method: 'PUT',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelAnswer }),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: QuestionAnswerKey };
  return json.data;
}
