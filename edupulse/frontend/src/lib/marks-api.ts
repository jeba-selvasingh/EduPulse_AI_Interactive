import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type MarksQuestion = {
  id: string;
  questionKey: string;
  maxMarks: number;
};

export type MarksCell = {
  usn: string;
  questionId: string;
  marks: number | null;
  isSaved: boolean;
  isReadOnly?: boolean;
  validationError?: string | null;
};

export type MarksGridRow = {
  usn: string;
  studentName: string;
  cells: MarksCell[];
  rowTotal: number | null;
};

export type MarksCompletion = {
  savedCells: number;
  totalCells: number;
  completedStudents: number;
  totalStudents: number;
};

export type MarksGrid = {
  assessmentId: string;
  courseCode: string;
  examType: string;
  institutionId: string;
  questions: MarksQuestion[];
  rows: MarksGridRow[];
  completion: MarksCompletion;
  lastSavedAt: string | null;
  lastSavedBy: string | null;
  isPublished: boolean;
  isReadOnly: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  source: 'evaluation_ai' | 'manual' | null;
  publishBatchId: string | null;
};

export type PartialSaveCell = {
  usn: string;
  questionId: string;
  marks: number | null;
};

export type PartialSaveResult = {
  grid: MarksGrid;
  rejected: Array<{ usn: string; questionId: string; message: string }>;
};

export async function fetchMarksGrid(courseCode: string, examType: string): Promise<MarksGrid> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/grid`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Marks grid fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: MarksGrid };
  return json.data;
}

export async function partialSaveMarks(
  courseCode: string,
  examType: string,
  cells: PartialSaveCell[],
): Promise<PartialSaveResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/grid`,
    {
      method: 'PUT',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cells }),
    },
  );
  if (!response.ok) throw new Error(`Marks partial save failed: ${response.status}`);
  const json = (await response.json()) as { data: PartialSaveResult };
  return json.data;
}

export type MarksImportTemplate = {
  fileName: string;
  base64: string;
  csv: string;
  header: string[];
};

export type MarksImportSummary = {
  rowsProcessed: number;
  rowsImported: number;
  cellsImported: number;
  errors: Array<{
    row: number;
    usn?: string;
    column?: string;
    message: string;
    code?: 'PARSE' | 'VALIDATION' | 'USN_MISMATCH';
  }>;
  usnMismatches: Array<{ row: number; usn: string; message: string }>;
  grid: MarksGrid;
};

export async function fetchMarksImportTemplate(
  courseCode: string,
  examType: string,
): Promise<MarksImportTemplate> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/import/template`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Marks template fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: MarksImportTemplate };
  return json.data;
}

export async function fetchMarksImportSample(
  courseCode: string,
  examType: string,
): Promise<MarksImportTemplate> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/import/sample`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Marks sample fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: MarksImportTemplate };
  return json.data;
}

export async function importMarksFile(
  courseCode: string,
  examType: string,
  payload: { csv?: string; base64?: string; fileName?: string },
): Promise<MarksImportSummary> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/import`,
    {
      method: 'POST',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(`Marks import failed: ${response.status}`);
  const json = (await response.json()) as { data: MarksImportSummary };
  return json.data;
}

export type MasteryBand = 'green' | 'amber' | 'red' | 'missing';

export type MasteryCell = {
  coTag: string;
  masteryPercent: number | null;
  band: MasteryBand;
};

export type MasteryHeatmapRow = {
  usn: string;
  studentName: string;
  cells: MasteryCell[];
};

export type WeakCluster = {
  coTag: string;
  title: string;
  weakCount: number;
  studentsWithData: number;
  weakPercent: number;
  isHighlighted: boolean;
};

export type MasteryHeatmap = {
  assessmentId: string;
  courseCode: string;
  examType: string;
  institutionId: string;
  courseOutcomes: Array<{ coTag: string; title: string }>;
  rows: MasteryHeatmapRow[];
  weakClusters: WeakCluster[];
  computedAt: string;
  studentsWithMarks: number;
  totalStudents: number;
};

export async function fetchMasteryHeatmap(
  courseCode: string,
  examType: string,
): Promise<MasteryHeatmap> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/heatmap`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Mastery heatmap fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: MasteryHeatmap };
  return json.data;
}

export type HeatmapClusterStudent = {
  usn: string;
  studentName: string;
  masteryPercent: number;
  band: MasteryBand;
  diagnosisRoute: string;
};

export type HeatmapClusterDrilldown = {
  courseCode: string;
  examType: string;
  coTag: string;
  title: string;
  scope: 'weak' | 'all';
  cluster: WeakCluster;
  students: HeatmapClusterStudent[];
  diagnosisEntryRoute: string;
};

export async function fetchHeatmapClusterDrilldown(
  courseCode: string,
  examType: string,
  coTag: string,
  scope: 'weak' | 'all' = 'weak',
): Promise<HeatmapClusterDrilldown> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/heatmap/clusters/${encodeURIComponent(coTag)}?scope=${scope}`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Heatmap drill-down fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: HeatmapClusterDrilldown };
  return json.data;
}

export type ErpExportColumn = {
  key: string;
  header: string;
};

export type ErpExportTemplate = {
  templateId: string;
  institutionSlug: string;
  columns: ErpExportColumn[];
};

export type MarksCsvExport = {
  fileName: string;
  csv: string;
  contentType: 'text/csv';
  rowCount: number;
  exportedAt: string;
  templateId: string;
  assessmentId: string;
  courseCode: string;
  examType: string;
  institutionCode: string;
};

export async function fetchErpExportTemplate(
  courseCode: string,
  examType: string,
): Promise<ErpExportTemplate> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/export/template`,
    { headers: await getApiHeaders() },
  );
  if (!response.ok) throw new Error(`Export template fetch failed: ${response.status}`);
  const json = (await response.json()) as { data: ErpExportTemplate };
  return json.data;
}

export async function fetchMarksCsvExport(
  courseCode: string,
  examType: string,
): Promise<MarksCsvExport> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/marks/assessments/${encodeURIComponent(courseCode)}/${encodeURIComponent(examType)}/export/csv`,
    { headers: await getApiHeaders() },
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
          : `Export failed: ${response.status}`;
    throw new Error(message);
  }

  const json = (await response.json()) as { data: MarksCsvExport };
  return json.data;
}

export function downloadCsvExport(exportFile: MarksCsvExport): void {
  if (typeof document !== 'undefined') {
    const blob = new Blob([exportFile.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFile.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
