/** Minimal valid PDF for pilot uploads and samples */
export const MINIMAL_PDF_BYTES = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj',
    'xref',
    '0 4',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000052 00000 n ',
    '0000000101 00000 n ',
    'trailer<< /Size 4 /Root 1 0 R >>',
    'startxref',
    '178',
    '%%EOF',
  ].join('\n'),
  'utf8',
);

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

export function decodeBase64Payload(base64: string): Buffer {
  const normalized = base64.includes(',') ? base64.split(',').pop()! : base64;
  return Buffer.from(normalized.trim(), 'base64');
}
