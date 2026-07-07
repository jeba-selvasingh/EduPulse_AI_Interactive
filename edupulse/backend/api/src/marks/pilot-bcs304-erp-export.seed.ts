import type { ErpExportTemplate } from './marks-export.schema';

/** PES IT ERP v1 column mapping for BCS304 IA-2 published marks export. */
export function buildPilotBcs304ErpExportTemplate(institutionSlug = 'pes'): ErpExportTemplate {
  return {
    templateId: 'pes-erp-v1',
    institutionSlug,
    columns: [
      { key: 'usn', header: 'USN' },
      { key: 'studentName', header: 'Student Name' },
      { key: 'courseCode', header: 'Course Code' },
      { key: 'assessmentId', header: 'Assessment ID' },
      { key: 'Q1', header: 'Q1' },
      { key: 'Q2', header: 'Q2' },
      { key: 'Q3', header: 'Q3' },
      { key: 'total', header: 'Total' },
    ],
  };
}
