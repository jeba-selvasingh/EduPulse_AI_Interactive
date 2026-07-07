import * as XLSX from 'xlsx';
import type { AssessmentQuestion } from './marks.schema';

export function buildMarksImportHeader(questions: AssessmentQuestion[]): string[] {
  return ['USN', 'Student Name', ...questions.map((question) => question.questionKey)];
}

export function buildMarksImportXlsx(questions: AssessmentQuestion[], dataRows: string[][] = []): Buffer {
  const header = buildMarksImportHeader(questions);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Marks');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function buildMarksImportCsv(questions: AssessmentQuestion[], dataRows: string[][] = []): string {
  const header = buildMarksImportHeader(questions);
  const lines = [header.join(','), ...dataRows.map((row) => row.join(','))];
  return lines.join('\n');
}

export function parseMarksImportRows(input: { base64?: string; csv?: string }): string[][] {
  if (input.csv) {
    return parseCsvRows(input.csv);
  }

  if (!input.base64) {
    return [];
  }

  const normalized = input.base64.includes(',') ? input.base64.split(',').pop()! : input.base64;
  const buffer = Buffer.from(normalized.trim(), 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
}

function parseCsvRows(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

export function normalizeHeaderCell(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isRowEmpty(cells: unknown[]): boolean {
  return cells.every((cell) => String(cell ?? '').trim() === '');
}

export function parseMarkValue(raw: unknown): number | null | 'invalid' {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  const parsed = Number.parseInt(text, 10);
  if (Number.isNaN(parsed)) return 'invalid';
  return parsed;
}
