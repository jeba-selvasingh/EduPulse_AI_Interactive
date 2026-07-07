const PII_FIELD_PATTERN =
  /^(name|email|password|usn|roll|rollNumber|studentName|studentId|mark|marks|score|grade|phone|address)$/i;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const USN_PATTERN = /\b\d{2}[A-Z]{2,4}\d{3,5}\b/;

function scrubValue(key: string, value: unknown): unknown {
  if (PII_FIELD_PATTERN.test(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    if (EMAIL_PATTERN.test(value)) {
      return '[REDACTED_EMAIL]';
    }
    if (USN_PATTERN.test(value)) {
      return '[REDACTED_USN]';
    }
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => scrubValue(String(index), item));
  }

  if (value && typeof value === 'object') {
    return scrubMetadata(value as Record<string, unknown>);
  }

  return value;
}

/** Strip student names, USNs, marks, and other PII from log metadata (NFR-7). */
export function scrubMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const scrubbed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    scrubbed[key] = scrubValue(key, value);
  }

  return scrubbed;
}
