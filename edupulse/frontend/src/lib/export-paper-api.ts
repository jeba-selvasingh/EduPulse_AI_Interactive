import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type PaperPdfExport = {
  paperId: string;
  fileName: string;
  mimeType: 'application/pdf';
  base64: string;
  exportedAt: string;
  exportedBy: string;
  exportedByName: string;
  institutionId: string;
  institutionName: string;
  courseCode: string;
  examType: string;
  totalMarks: number;
  questionCount: number;
  includesAnswerKey: boolean;
  moderationStatus: 'approved';
  byteLength: number;
};

export async function exportApprovedPaperPdf(
  paperId: string,
  includeAnswerKey = true,
): Promise<PaperPdfExport> {
  const baseUrl = getApiBaseUrl();
  const query = includeAnswerKey ? '' : '?includeAnswerKey=false';
  const response = await fetch(
    `${baseUrl}/api/paper-craft/papers/${encodeURIComponent(paperId)}/export/pdf${query}`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );

  if (response.status === 403) throw new Error('ACCESS_DENIED');
  if (response.status === 400) throw new Error('NOT_APPROVED');
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const json = (await response.json()) as { data: PaperPdfExport };
  return json.data;
}
