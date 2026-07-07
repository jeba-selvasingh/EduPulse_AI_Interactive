import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type ImportSummary = {
  rowsProcessed: number;
  studentsCreated: number;
  studentsUpdated: number;
  coursesCreated: number;
  coursesUpdated: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
  errors: Array<{ row: number; message: string }>;
};

export type CourseRoster = {
  courseCode: string;
  section?: string;
  semester?: string;
  students: Array<{ usn: string; name: string }>;
  total: number;
};

export async function fetchCohortTemplate(): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/cohort/import/template`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Template fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: { csv: string } };
  return json.data.csv;
}

export async function fetchCohortSample(): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/cohort/import/sample`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Sample fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: { csv: string } };
  return json.data.csv;
}

export async function importCohortCsv(csv: string): Promise<ImportSummary> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/cohort/import`, {
    method: 'POST',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ csv }),
  });
  if (!response.ok) throw new Error(`Import failed: ${response.status}`);
  const json = (await response.json()) as { data: ImportSummary };
  return json.data;
}

export async function fetchCourseRoster(courseCode: string): Promise<CourseRoster> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/cohort/courses/${encodeURIComponent(courseCode)}/roster`, {
    headers: await getApiHeaders(),
  });
  if (!response.ok) throw new Error(`Roster fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: CourseRoster };
  return json.data;
}
