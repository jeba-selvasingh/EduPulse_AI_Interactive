import type { BulkUploadBody } from './bulk-upload.schema';

const USN_FILENAME_PATTERN = /PES1UG23CS\d{3}/i;

export const LOW_DPI_WARNING =
  'Scan quality below 200 DPI — recommend rescanning for reliable handwriting recognition.';

export const BULK_SIZE_LIMIT_MESSAGE =
  'Upload exceeds the 200 MB limit. Split the batch or compress scans before retrying.';

export const MIN_RECOMMENDED_DPI = 200;

export function extractUsnFromFileName(fileName: string): string | null {
  const baseName = fileName.split('/').pop()?.split('\\').pop() ?? fileName;
  const match = baseName.match(USN_FILENAME_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

export function resolveUploadByteLength(body: BulkUploadBody): number {
  if (body.byteLength != null) return body.byteLength;

  let total = body.base64 ? Buffer.byteLength(body.base64, 'base64') : 0;
  for (const entry of body.entries ?? []) {
    if (entry.base64) {
      total += Buffer.byteLength(entry.base64, 'base64');
    }
  }
  return total;
}

export function inferUploadKind(fileName: string): 'pdf' | 'zip' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.zip')) return 'zip';
  return 'pdf';
}

export function normalizeUploadEntries(body: BulkUploadBody): Array<{
  fileName: string;
  estimatedDpi: number;
}> {
  const kind = inferUploadKind(body.fileName);

  if (kind === 'pdf') {
    return [
      {
        fileName: body.fileName,
        estimatedDpi: body.estimatedDpi ?? 300,
      },
    ];
  }

  if (!body.entries?.length) {
    return [];
  }

  return body.entries.map((entry) => ({
    fileName: entry.fileName,
    estimatedDpi: entry.estimatedDpi ?? 300,
  }));
}

export function lowDpiWarning(estimatedDpi: number): string | null {
  return estimatedDpi < MIN_RECOMMENDED_DPI ? LOW_DPI_WARNING : null;
}
