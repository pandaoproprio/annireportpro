import { Project } from '@/types';
import { JustificationReport } from '@/types/justificationReport';
import {
  createPdfContext, ensureSpace, addParagraph, addBulletItem,
  addSectionTitle, addHeaderLine, addFooterAndPageNumbers, addSignatureBlock,
  parseHtmlToBlocks,
  PAGE_W, CW, LINE_H,
} from '@/lib/pdfHelpers';

interface JustificationExportData {
  project: Project;
  report: JustificationReport;
}

const sectionDefs = [
  { key: 'objectSection', title: '1. DO OBJETO DO TERMO ADITIVO' },
  { key: 'justificationSection', title: '2. DA JUSTIFICATIVA PARA A PRORROGAÇÃO' },
  { key: 'executedActionsSection', title: '3. DAS AÇÕES JÁ EXECUTADAS (RESULTADOS PARCIAIS)' },
  { key: 'futureActionsSection', title: '4. DAS AÇÕES FUTURAS PREVISTAS NO PERÍODO DE PRORROGAÇÃO' },
  { key: 'requestedDeadlineSection', title: '5. DO PRAZO SOLICITADO' },
  { key: 'attachmentsSection', title: '6. ANEXOS' },
] as const;

export const exportJustificationToPdf = async (data: JustificationExportData) => {
  const { project, report } = data;
  const ctx = createPdfContext();
  const { pdf } = ctx;

  // ── Title (centered, 16pt bold) ──
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16);
  const titleLines = pdf.splitTextToSize('JUSTIFICATIVA PARA PRORROGAÇÃO DE PRAZO DO PROJETO', CW);
  for (const line of titleLines) {
    pdf.text(line, PAGE_W / 2, ctx.currentY, { align: 'center' });
    ctx.currentY += 8;
  }
  ctx.currentY += 6;

  // ── Header info ──
  addHeaderLine(ctx, 'Projeto:', project.name);
  addHeaderLine(ctx, 'Termo de Fomento nº:', project.fomentoNumber);
  addHeaderLine(ctx, 'Organização:', project.organizationName);
  ctx.currentY += 6;

  // ── Addressee ──
  addParagraph(ctx, `Ao ${project.funder},`);
  ctx.currentY += 6;

  // ── Sections ──
  for (const section of sectionDefs) {
    ensureSpace(ctx, 20);
    addSectionTitle(ctx, section.title);
    const blocks = parseHtmlToBlocks(report[section.key]);
    for (const block of blocks) {
      if (block.type === 'bullet') addBulletItem(ctx, block.content);
      else addParagraph(ctx, block.content);
    }
    ctx.currentY += 4;
  }

  // ── Signature ──
  ctx.currentY += 15;
  ensureSpace(ctx, 50);
  const currentDate = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateText = `Rio de Janeiro, ${currentDate}.`;
  addSignatureBlock(ctx, project.organizationName, dateText, 'Assinatura do responsável legal');

  // ── Footer + page numbers (skip page 1) ──
  addFooterAndPageNumbers(ctx, project.organizationName, true);

  // Save
  const filename = `Justificativa_Prorrogacao_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};
