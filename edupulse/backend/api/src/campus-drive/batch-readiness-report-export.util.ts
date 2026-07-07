import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import type { BatchReadinessReportView } from './batch-readiness-report.schema';

const BRAND_COLOR = '#534AB7';

export async function buildBatchReadinessPdf(
  report: BatchReadinessReportView,
  institutionName: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor(BRAND_COLOR).fontSize(18).text('Batch Readiness Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fillColor('#333333').fontSize(11).text(`${institutionName} · ${report.reportTitle}`);
    doc.text(`${report.batchLabel} · ${report.batchStrength} students · ${report.generatedAt.slice(0, 10)}`);
    doc.moveDown();

    doc.fontSize(13).fillColor(BRAND_COLOR).text('Readiness tier distribution');
    doc.moveDown(0.4);
    for (const tier of report.tierDistribution) {
      doc.fontSize(10).fillColor('#222222').text(`${tier.label}: ${tier.count} · ${tier.percent}%`);
    }
    doc.moveDown();

    doc.fontSize(13).fillColor(BRAND_COLOR).text('Top gaps across batch');
    doc.moveDown(0.4);
    for (const gap of report.topGaps) {
      doc.fontSize(10).fillColor('#222222').text(`${gap.label}: ${gap.countLabel}`);
    }
    doc.moveDown();

    doc.fontSize(13).fillColor(BRAND_COLOR).text('Dept-wise readiness');
    doc.moveDown(0.4);
    for (const dept of report.departmentReadiness) {
      doc.fontSize(10).fillColor('#222222').text(`${dept.department}: ${dept.readinessPercent}%`);
    }
    doc.moveDown();

    doc.fontSize(13).fillColor(BRAND_COLOR).text('Recovery forecast');
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#222222').text(report.recoveryForecast.summary, { width: 500 });

    doc.end();
  });
}

export function buildBatchReadinessXlsx(report: BatchReadinessReportView): Buffer {
  const tierRows = report.tierDistribution.map((tier) => [
    tier.label,
    tier.count,
    tier.percent,
  ]);
  const gapRows = report.topGaps.map((gap) => [gap.label, gap.studentCount, gap.severity]);
  const deptRows = report.departmentReadiness.map((dept) => [
    dept.department,
    dept.readinessPercent,
  ]);

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Batch Readiness Report'],
    ['Title', report.reportTitle],
    ['Batch', report.batchLabel],
    ['Strength', report.batchStrength],
    ['Generated', report.generatedAt],
    [],
    ['Recovery forecast', report.recoveryForecast.summary],
    ['Current placement %', report.recoveryForecast.currentPlacementPercent],
    ['Projected placement %', report.recoveryForecast.projectedPlacementPercent],
    ['At-risk to Core (projected)', report.recoveryForecast.atRiskToCoreCount],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const tierSheet = XLSX.utils.aoa_to_sheet([
    ['Tier', 'Count', 'Percent'],
    ...tierRows,
  ]);
  XLSX.utils.book_append_sheet(workbook, tierSheet, 'Tier distribution');

  const gapSheet = XLSX.utils.aoa_to_sheet([
    ['Gap', 'Students', 'Severity'],
    ...gapRows,
  ]);
  XLSX.utils.book_append_sheet(workbook, gapSheet, 'Top gaps');

  const deptSheet = XLSX.utils.aoa_to_sheet([
    ['Department', 'Readiness %'],
    ...deptRows,
  ]);
  XLSX.utils.book_append_sheet(workbook, deptSheet, 'Departments');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
