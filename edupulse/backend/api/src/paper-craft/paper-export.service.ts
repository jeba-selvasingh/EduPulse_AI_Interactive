import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { AuthUser } from '../auth/auth.types';
import { InstitutionsService } from '../institutions/institutions.service';
import { isPdfBuffer } from '../syllabus/syllabus-pdf.util';
import { AnswerKeyService } from './answer-key.service';
import type { PaperPdfExport } from './paper-export.schema';
import { PaperCraftStoreService } from './paper-craft-store.service';
import { PaperModerationStoreService } from './paper-moderation-store.service';

const BRAND_COLOR = '#085041';

@Injectable()
export class PaperExportService {
  constructor(
    private readonly papers: PaperCraftStoreService,
    private readonly moderationStore: PaperModerationStoreService,
    private readonly answerKeys: AnswerKeyService,
    private readonly institutions: InstitutionsService,
  ) {}

  async exportApprovedPaperPdf(
    user: AuthUser,
    paperId: string,
    options: { includeAnswerKey?: boolean },
  ): Promise<PaperPdfExport> {
    const includeAnswerKey = options.includeAnswerKey ?? true;
    const paper = this.papers.getById(paperId);
    if (!paper || paper.institutionId !== user.institutionId) {
      throw new NotFoundException({
        code: 'PAPER_NOT_FOUND',
        message: 'Generated question paper not found',
      });
    }

    const moderation = this.moderationStore.get(paperId);
    if (!moderation || moderation.status !== 'approved') {
      throw new BadRequestException({
        code: 'PAPER_NOT_APPROVED',
        message: 'Only moderator-approved paper packages can be exported as PDF',
      });
    }

    const institution = await this.institutions.getById(paper.institutionId);
    const answerKey = includeAnswerKey
      ? this.answerKeys.getAnswerKey(user, paperId)
      : null;

    const exportedAt = new Date().toISOString();
    const buffer = await renderPaperPdf({
      institutionName: institution.name,
      courseCode: paper.courseCode,
      examType: paper.examType,
      totalMarks: paper.totalMarks,
      questionCount: paper.questionCount,
      exportedAt,
      exportedByName: user.name,
      paper,
      answerKey,
      includeAnswerKey,
    });

    if (!isPdfBuffer(buffer)) {
      throw new BadRequestException({
        code: 'PDF_GENERATION_FAILED',
        message: 'PDF export did not produce a valid document',
      });
    }

    const fileName = `${paper.courseCode}-${paper.examType}-paper${includeAnswerKey ? '-with-answer-key' : ''}.pdf`;

    return {
      paperId: paper.id,
      fileName,
      mimeType: 'application/pdf',
      base64: buffer.toString('base64'),
      exportedAt,
      exportedBy: user.sub,
      exportedByName: user.name,
      institutionId: paper.institutionId,
      institutionName: institution.name,
      courseCode: paper.courseCode,
      examType: paper.examType,
      totalMarks: paper.totalMarks,
      questionCount: paper.questionCount,
      includesAnswerKey: includeAnswerKey && Boolean(answerKey),
      moderationStatus: 'approved',
      byteLength: buffer.length,
    };
  }
}

type RenderInput = {
  institutionName: string;
  courseCode: string;
  examType: string;
  totalMarks: number;
  questionCount: number;
  exportedAt: string;
  exportedByName: string;
  paper: {
    questions: Array<{
      questionKey: string;
      moduleNumber: number;
      marks: number;
      bloomLevel: number;
      coTag: string;
      poTag: string;
      text: string;
    }>;
  };
  answerKey: {
    questions: Array<{
      questionKey: string;
      maxMarks: number;
      modelAnswer: string;
      rubricSteps: Array<{ label: string; marks: number }>;
    }>;
  } | null;
  includeAnswerKey: boolean;
};

function renderPaperPdf(input: RenderInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor(BRAND_COLOR).fontSize(20).text(input.institutionName, { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#444444').fontSize(11).text('EduPulse AI · Examination Paper', { align: 'center' });
    doc.moveDown(1);

    doc.fillColor('#111111').fontSize(14).text(`${input.courseCode} · ${input.examType}`, {
      align: 'center',
    });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555555');
    doc.text(`Total marks: ${input.totalMarks} · Questions: ${input.questionCount}`);
    doc.text(`Exported: ${formatExportDate(input.exportedAt)} · By: ${input.exportedByName}`);
    doc.moveDown(1);

    doc.fillColor(BRAND_COLOR).fontSize(12).text('Question Paper');
    doc.moveDown(0.5);
    doc.fillColor('#111111').fontSize(10);

    for (const question of input.paper.questions) {
      doc
        .font('Helvetica-Bold')
        .text(
          `${question.questionKey} · Module ${question.moduleNumber} · ${question.marks} marks · Bloom L${question.bloomLevel} · ${question.coTag} → ${question.poTag}`,
        );
      doc.font('Helvetica').text(question.text, { align: 'justify' });
      doc.moveDown(0.6);

      if (doc.y > 700) {
        doc.addPage();
      }
    }

    if (input.includeAnswerKey && input.answerKey) {
      doc.addPage();
      doc.fillColor(BRAND_COLOR).fontSize(12).text('Answer Key & Rubric');
      doc.moveDown(0.5);
      doc.fillColor('#111111').fontSize(10);

      for (const entry of input.answerKey.questions) {
        doc.font('Helvetica-Bold').text(`${entry.questionKey} · ${entry.maxMarks} marks`);
        doc.font('Helvetica').text('Model answer:', { continued: false });
        doc.text(entry.modelAnswer, { align: 'justify' });
        doc.font('Helvetica-Bold').text('Rubric steps:');
        for (const step of entry.rubricSteps) {
          doc.font('Helvetica').text(`• ${step.label} — ${step.marks} mark(s)`);
        }
        doc.moveDown(0.6);

        if (doc.y > 700) {
          doc.addPage();
        }
      }
    }

    doc.end();
  });
}

function formatExportDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
