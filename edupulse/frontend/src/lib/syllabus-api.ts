import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type SyllabusModule = {
  id: string;
  syllabusId: string;
  moduleNumber: number;
  title: string;
  pageStart: number;
  pageEnd: number;
};

export type SyllabusModuleInput = {
  moduleNumber: number;
  title: string;
  pageStart: number;
  pageEnd: number;
};

export type PaperCraftModule = {
  id: string;
  moduleNumber: number;
  title: string;
  pageStart: number;
  pageEnd: number;
  label: string;
};

export type SyllabusRecord = {
  id: string;
  courseCode: string;
  academicTerm: string;
  fileName: string;
  storageKey: string;
  mimeType: 'application/pdf';
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  status: 'active' | 'superseded' | 'pending';
  activatedAt: string | null;
  supersededAt: string | null;
};

export type SyllabusUploadResult = {
  record: SyllabusRecord;
  requiresActivation: boolean;
};

export type ActivateVersionResult = {
  activated: SyllabusRecord;
  superseded: SyllabusRecord | null;
};

export type SyllabusGenerationWarning = {
  code: 'SUPERSEDED_SYLLABUS';
  message: string;
  syllabusVersionId: string;
  activeVersionId: string;
  activeVersion: number;
  supersededVersion: number;
};

export type SamplePdf = {
  fileName: string;
  base64: string;
};

export async function fetchSampleSyllabusPdf(): Promise<SamplePdf> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/syllabus/sample/pdf`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Sample PDF fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: SamplePdf };
  return json.data;
}

export async function fetchCourseSyllabus(courseCode: string): Promise<SyllabusRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/syllabus/courses/${encodeURIComponent(courseCode)}`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Syllabus fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: SyllabusRecord };
  return json.data;
}

export async function uploadSyllabusPdf(
  courseCode: string,
  input: { fileName: string; base64: string; academicTerm?: string },
): Promise<SyllabusUploadResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/syllabus/courses/${encodeURIComponent(courseCode)}/upload`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Upload failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: SyllabusUploadResult };
  return json.data;
}

export async function fetchSyllabusModules(courseCode: string): Promise<SyllabusModule[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/syllabus/courses/${encodeURIComponent(courseCode)}/modules`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Modules fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: SyllabusModule[] };
  return json.data;
}

export async function saveSyllabusModules(
  courseCode: string,
  modules: SyllabusModuleInput[],
): Promise<SyllabusModule[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/syllabus/courses/${encodeURIComponent(courseCode)}/modules`,
    {
      method: 'PUT',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modules }),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Save modules failed: ${response.status}`);
  }
  const json = (await response.json()) as { data: SyllabusModule[] };
  return json.data;
}

export const PILOT_BCS304_MODULES: SyllabusModuleInput[] = [
  { moduleNumber: 1, title: 'Introduction & Arrays', pageStart: 4, pageEnd: 18 },
  { moduleNumber: 2, title: 'Linked Lists', pageStart: 19, pageEnd: 41 },
  { moduleNumber: 3, title: 'Trees', pageStart: 42, pageEnd: 58 },
  { moduleNumber: 4, title: 'Graphs', pageStart: 59, pageEnd: 76 },
];

export async function fetchSyllabusVersions(courseCode: string): Promise<SyllabusRecord[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/syllabus/courses/${encodeURIComponent(courseCode)}/versions`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Versions fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: SyllabusRecord[] };
  return json.data;
}

export async function activateSyllabusVersion(
  courseCode: string,
  syllabusId: string,
): Promise<ActivateVersionResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/syllabus/courses/${encodeURIComponent(courseCode)}/versions/${encodeURIComponent(syllabusId)}/activate`,
    {
      method: 'POST',
      headers: await getApiHeaders(),
    },
  );
  if (!response.ok) throw new Error(`Activate failed: ${response.status}`);
  const json = (await response.json()) as { data: ActivateVersionResult };
  return json.data;
}

export async function fetchGenerationWarning(
  syllabusVersionId: string,
): Promise<SyllabusGenerationWarning | null> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/syllabus/versions/${encodeURIComponent(syllabusVersionId)}/generation-warning`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Warning fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: SyllabusGenerationWarning | null };
  return json.data;
}
