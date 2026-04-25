import jsPDF from 'jspdf';
import { Document as DocxDocument, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import type { LegalJustification, JustificationSignature } from '@/hooks/useLegalJustifications';
import { TYPE_LABELS } from '@/hooks/useLegalJustifications';

const generateQrDataUrl = async (text: string): Promise<string> => {
  return await QRCode.toDataURL(text, { margin: 1, width: 256, errorCorrectionLevel: 'M' });
};

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

interface ProjectInfo {
  name?: string;
  fomento_number?: string;
  funder?: string;
  funder_cnpj?: string;
  organization_name?: string;
  organization_cnpj?: string;
  organization_address?: string;
  legal_responsible_name?: string;
  legal_responsible_cpf?: string;
  legal_responsible_role?: string;
  start_date?: string;
  end_date?: string;
}

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
};

const fmtDateLong = (d?: Date) => {
  const dt = d || new Date();
  return dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const buildIdentificationText = (project: ProjectInfo) => {
  return [
    `Concedente: ${project.funder || '—'}${project.funder_cnpj ? ` — CNPJ ${project.funder_cnpj}` : ''}`,
    `Convenente: ${project.organization_name || '—'}${project.organization_cnpj ? ` — CNPJ ${project.organization_cnpj}` : ''}`,
    project.organization_address ? `Endereço: ${project.organization_address}` : '',
  ].filter(Boolean).join('\n');
};

const VERIFY_BASE = `${typeof window !== 'undefined' ? window.location.origin : 'https://annireportpro.lovable.app'}/verificar/`;

export const exportJustificationPDF = async (
  just: LegalJustification,
  project: ProjectInfo,
  signatures: JustificationSignature[],
) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 30) {
      addFooter();
      pdf.addPage();
      y = margin;
    }
  };

  const addFooter = () => {
    const totalPages = (pdf as any).internal.getNumberOfPages();
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    const footerY = pageH - 12;
    if (just.qr_verification_code) {
      pdf.text(`Verificação: ${VERIFY_BASE}${just.qr_verification_code}`, margin, footerY);
    }
    pdf.text(`Pág. ${(pdf as any).internal.getCurrentPageInfo().pageNumber}/${totalPages}`, pageW - margin, footerY, { align: 'right' });
    if (just.document_hash) {
      pdf.text(`Hash SHA-256: ${just.document_hash.substring(0, 32)}…`, margin, footerY + 4);
    }
  };

  const writeParagraph = (text: string, opts: { bold?: boolean; size?: number; align?: 'left' | 'center'; spacingAfter?: number } = {}) => {
    pdf.setFont('times', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(opts.size || 11);
    const lines = pdf.splitTextToSize(text, contentW);
    for (const line of lines) {
      ensureSpace(7);
      pdf.text(line, opts.align === 'center' ? pageW / 2 : margin, y, { align: opts.align || 'left' });
      y += 5.5;
    }
    if (opts.spacingAfter) y += opts.spacingAfter;
  };

  // === CABEÇALHO ===
  writeParagraph('CENTRO DE ARTICULAÇÃO DE POPULAÇÕES MARGINALIZADAS — CEAP', { bold: true, size: 10, align: 'center' });
  y += 2;
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  writeParagraph(just.document_title || TYPE_LABELS[just.type], { bold: true, size: 14, align: 'center', spacingAfter: 4 });
  writeParagraph(`Ref.: Termo de Fomento nº ${project.fomento_number || '—'}`, { align: 'center', size: 10 });
  writeParagraph(`Objeto: ${(project.name || '').substring(0, 100)}`, { align: 'center', size: 10 });
  if (just.reference_period_start || just.reference_period_end) {
    writeParagraph(`Período: ${fmtDate(just.reference_period_start)} a ${fmtDate(just.reference_period_end)}`, { align: 'center', size: 10 });
  }
  writeParagraph(`Data: ${fmtDateLong()}`, { align: 'center', size: 10, spacingAfter: 6 });

  // === SEÇÃO 1 — IDENTIFICAÇÃO ===
  writeParagraph('1. IDENTIFICAÇÃO DAS PARTES', { bold: true, size: 12, spacingAfter: 2 });
  writeParagraph(buildIdentificationText(project), { size: 11, spacingAfter: 4 });

  // === CORPO (gerado pela IA — já vem com seções 2-7) ===
  const bodyParas = (just.document_body || '').split(/\n\n+/);
  for (const para of bodyParas) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const isHeader = /^[0-9]+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(trimmed) && trimmed.length < 100;
    writeParagraph(trimmed, { bold: isHeader, size: isHeader ? 12 : 11, spacingAfter: isHeader ? 2 : 4 });
  }

  // === ASSINATURAS ===
  ensureSpace(60);
  y += 10;
  writeParagraph(`Rio de Janeiro, ${fmtDateLong()}`, { align: 'center', spacingAfter: 12 });

  for (const sig of signatures) {
    ensureSpace(30);
    pdf.line(pageW / 2 - 50, y, pageW / 2 + 50, y);
    y += 5;
    writeParagraph(sig.signer_name, { bold: true, align: 'center' });
    if (sig.signer_role) writeParagraph(sig.signer_role, { align: 'center', size: 10 });
    writeParagraph(`${sig.signer_cpf_cnpj.length > 14 ? 'CNPJ' : 'CPF'}: ${sig.signer_cpf_cnpj}`, { align: 'center', size: 10 });
    if (sig.signed && sig.signed_at) {
      writeParagraph(`Assinado eletronicamente em ${new Date(sig.signed_at).toLocaleString('pt-BR')}`, { align: 'center', size: 9 });
    } else {
      writeParagraph('(Assinatura pendente)', { align: 'center', size: 9 });
    }
    y += 8;
  }

  // === INSTRUÇÕES GOV.BR (se ainda não lacrado, página adicional) ===
  if (!just.is_sealed) {
    pdf.addPage();
    y = margin;
    writeParagraph('INSTRUÇÕES PARA ASSINATURA VIA GOV.BR', { bold: true, size: 12, align: 'center', spacingAfter: 6 });
    const instr = `1. Acesse: assinador.iti.br
2. Faça login com sua conta gov.br (nível Prata ou Ouro)
3. Clique em "Assinar Documento"
4. Faça upload deste arquivo PDF
5. Posicione a assinatura no campo indicado
6. Confirme com sua senha ou biometria do aplicativo gov.br
7. Baixe o PDF assinado e encaminhe ao CEAP`;
    writeParagraph(instr, { size: 11, spacingAfter: 6 });
    if (just.qr_verification_code) {
      writeParagraph(`Para verificar a autenticidade deste documento, acesse:\n${VERIFY_BASE}${just.qr_verification_code}`, { size: 10, align: 'center' });
    }
  }

  addFooter();
  const filename = `${TYPE_LABELS[just.type].replace(/\s+/g, '_')}_${(project.fomento_number || 'sem_numero').replace(/\W+/g, '')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

export const exportJustificationDOCX = async (
  just: LegalJustification,
  project: ProjectInfo,
  signatures: JustificationSignature[],
) => {
  const children: any[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'CENTRO DE ARTICULAÇÃO DE POPULAÇÕES MARGINALIZADAS — CEAP', bold: true, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: just.document_title || TYPE_LABELS[just.type], bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Ref.: Termo de Fomento nº ${project.fomento_number || '—'}`, size: 22 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Objeto: ${project.name || ''}`, size: 22 })],
      alignment: AlignmentType.CENTER,
    }),
  );

  if (just.reference_period_start || just.reference_period_end) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `Período: ${fmtDate(just.reference_period_start)} a ${fmtDate(just.reference_period_end)}`, size: 22 })],
      alignment: AlignmentType.CENTER,
    }));
  }
  children.push(new Paragraph({
    children: [new TextRun({ text: `Data: ${fmtDateLong()}`, size: 22 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  children.push(new Paragraph({
    children: [new TextRun({ text: '1. IDENTIFICAÇÃO DAS PARTES', bold: true, size: 26 })],
    spacing: { after: 200 },
  }));
  buildIdentificationText(project).split('\n').forEach((line) => {
    children.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })] }));
  });
  children.push(new Paragraph({ children: [new TextRun({ text: '', size: 22 })], spacing: { after: 200 } }));

  // Corpo
  (just.document_body || '').split(/\n\n+/).forEach((para) => {
    const trimmed = para.trim();
    if (!trimmed) return;
    const isHeader = /^[0-9]+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(trimmed) && trimmed.length < 100;
    children.push(new Paragraph({
      children: [new TextRun({ text: trimmed, bold: isHeader, size: isHeader ? 26 : 22 })],
      spacing: { after: 200 },
    }));
  });

  children.push(
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 400 } }),
    new Paragraph({
      children: [new TextRun({ text: `Rio de Janeiro, ${fmtDateLong()}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
  );

  signatures.forEach((sig) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '_________________________________', size: 22 })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: sig.signer_name, bold: true, size: 22 })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: sig.signer_role || '', size: 20 })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: `${sig.signer_cpf_cnpj.length > 14 ? 'CNPJ' : 'CPF'}: ${sig.signer_cpf_cnpj}`, size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    );
  });

  if (!just.is_sealed) {
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [new TextRun({ text: 'INSTRUÇÕES PARA ASSINATURA VIA GOV.BR', bold: true, size: 26 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      ...`1. Acesse: assinador.iti.br
2. Faça login com sua conta gov.br (nível Prata ou Ouro)
3. Clique em "Assinar Documento"
4. Faça upload deste arquivo PDF
5. Posicione a assinatura no campo indicado
6. Confirme com sua senha ou biometria do aplicativo gov.br
7. Baixe o PDF assinado e encaminhe ao CEAP`.split('\n').map((line) =>
        new Paragraph({ children: [new TextRun({ text: line, size: 22 })] })
      ),
    );
    if (just.qr_verification_code) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } }),
        new Paragraph({
          children: [new TextRun({ text: `Verificação: ${VERIFY_BASE}${just.qr_verification_code}`, size: 20 })],
          alignment: AlignmentType.CENTER,
        }),
      );
    }
  }

  const doc = new DocxDocument({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const filename = `${TYPE_LABELS[just.type].replace(/\s+/g, '_')}_${(project.fomento_number || 'sem_numero').replace(/\W+/g, '')}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, filename);
};
