import type { MarksGrid } from './marks.schema';
import type { ErpExportColumn, ErpExportTemplate } from './marks-export.schema';

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellValueForColumn(
  grid: MarksGrid,
  row: MarksGrid['rows'][number],
  column: ErpExportColumn,
): string {
  switch (column.key) {
    case 'usn':
      return row.usn;
    case 'studentName':
      return row.studentName;
    case 'courseCode':
      return grid.courseCode;
    case 'assessmentId':
      return grid.assessmentId;
    case 'examType':
      return grid.examType;
    case 'total':
      return row.rowTotal === null ? '' : String(row.rowTotal);
    default: {
      const question = grid.questions.find(
        (entry) => entry.id === column.key || entry.questionKey === column.key,
      );
      if (!question) return '';
      const cell = row.cells.find((entry) => entry.questionId === question.id);
      if (!cell || !cell.isSaved || cell.marks === null) return '';
      return String(cell.marks);
    }
  }
}

export function buildMarksExportFileName(
  institutionCode: string,
  courseCode: string,
  examType: string,
): string {
  const slug = institutionCode.toUpperCase();
  const safeExam = examType.replace(/\s+/g, '-');
  return `${slug}-${courseCode}-${safeExam}-marks-export.csv`;
}

export function buildMarksExportCsv(
  grid: MarksGrid,
  template: ErpExportTemplate,
  institutionCode: string,
): { csv: string; fileName: string; rowCount: number } {
  const exportRows = grid.rows.filter((row) => row.cells.some((cell) => cell.isSaved));
  const header = template.columns.map((column) => column.header);
  const lines = [
    header.map(escapeCsvCell).join(','),
    ...exportRows.map((row) =>
      template.columns.map((column) => escapeCsvCell(cellValueForColumn(grid, row, column))).join(','),
    ),
  ];

  return {
    csv: lines.join('\n'),
    fileName: buildMarksExportFileName(institutionCode, grid.courseCode, grid.examType),
    rowCount: exportRows.length,
  };
}
