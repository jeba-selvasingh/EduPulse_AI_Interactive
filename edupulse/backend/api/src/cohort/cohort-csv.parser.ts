/** Parse CSV rows for cohort import (quoted fields supported) */
export type ParsedCsvRow = {
  rowNumber: number;
  values: string[];
};

export function parseCohortCsv(csv: string): ParsedCsvRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const header = lines[0].toLowerCase();
  const startIndex =
    header.includes('usn') && header.includes('course') ? 1 : 0;

  return lines.slice(startIndex).map((line, index) => ({
    rowNumber: startIndex + index + 1,
    values: splitCsvLine(line),
  }));
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function rowToRecord(values: string[]): {
  usn: string;
  studentName: string;
  courseCode: string;
  section: string;
  semester: string;
} | null {
  if (values.length < 5) {
    return null;
  }

  const [usn, studentName, courseCode, section, semester] = values;

  return {
    usn: usn.trim(),
    studentName: studentName.trim(),
    courseCode: courseCode.trim().toUpperCase(),
    section: section.trim(),
    semester: semester.trim(),
  };
}
