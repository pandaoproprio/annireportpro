import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Footer,
  PageNumber,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { Project, TeamReport } from '@/types';

interface TeamReportExportData {
  project: Project;
  report: TeamReport;
}

// ABNT NBR 14724 formatting constants
const ABNT = {
  FONT_FAMILY: 'Times New Roman',
  FONT_SIZE_BODY: 24, // 12pt (half-points)
  FONT_SIZE_HEADING: 28, // 14pt
  FONT_SIZE_TITLE: 32, // 16pt
  LINE_SPACING: 360, // 1.5 line spacing (240 = single)
  FIRST_LINE_INDENT: convertInchesToTwip(0.5), // First line indent
  MARGIN_LEFT: 1701, // 3cm in twips
  MARGIN_RIGHT: 1134, // 2cm in twips
  MARGIN_TOP: 1701, // 3cm in twips
  MARGIN_BOTTOM: 1134, // 2cm in twips
};

const formatPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  return `[${startMonth} à ${endMonth}]`;
};

export const exportTeamReportToDocx = async (data: TeamReportExportData) => {
  const { project, report } = data;

  const docSections: Paragraph[] = [];

  // Title - centered, bold, uppercase
  docSections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'RELATÓRIO DA EQUIPE DE TRABALHO',
          bold: true,
          font: ABNT.FONT_FAMILY,
          size: ABNT.FONT_SIZE_TITLE,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, line: ABNT.LINE_SPACING },
    })
  );

  // Header info - left aligned
  docSections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Termo de Fomento nº: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: project.fomentoNumber, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Projeto: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: project.name, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Período de Referência: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: formatPeriod(report.periodStart, report.periodEnd), font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 400, line: ABNT.LINE_SPACING },
    })
  );

  // Section 1: Identification Data
  docSections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '1. Dados de Identificação',
          bold: true,
          font: ABNT.FONT_FAMILY,
          size: ABNT.FONT_SIZE_HEADING,
        }),
      ],
      spacing: { before: 400, after: 200, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Prestador: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: report.providerName || '[Não informado]', font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      spacing: { after: 100, line: ABNT.LINE_SPACING },
      indent: { left: 360 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Responsável Técnico: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: report.responsibleName, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      spacing: { after: 100, line: ABNT.LINE_SPACING },
      indent: { left: 360 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Função: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: report.functionRole, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      spacing: { after: 300, line: ABNT.LINE_SPACING },
      indent: { left: 360 },
    })
  );

  // Section 2: Execution Report
  docSections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '2. Relato de Execução da Coordenação do Projeto',
          bold: true,
          font: ABNT.FONT_FAMILY,
          size: ABNT.FONT_SIZE_HEADING,
        }),
      ],
      spacing: { before: 400, after: 200, line: ABNT.LINE_SPACING },
    })
  );

  // Split report text into paragraphs - ABNT justified with first line indent
  const reportParagraphs = report.executionReport.split('\n').filter(p => p.trim());
  for (const para of reportParagraphs) {
    docSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: para.trim(),
            font: ABNT.FONT_FAMILY,
            size: ABNT.FONT_SIZE_BODY,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: ABNT.LINE_SPACING },
        indent: { firstLine: ABNT.FIRST_LINE_INDENT },
      })
    );
  }

  // Section 3: Attachments (Photos)
  if (report.photos && report.photos.length > 0) {
    docSections.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [
          new TextRun({
            text: '3. Anexos de Comprovação',
            bold: true,
            font: ABNT.FONT_FAMILY,
            size: ABNT.FONT_SIZE_HEADING,
          }),
        ],
        spacing: { before: 400, after: 200, line: ABNT.LINE_SPACING },
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `${report.photos.length} registro(s) fotográfico(s) anexado(s).`,
            italics: true,
            font: ABNT.FONT_FAMILY,
            size: ABNT.FONT_SIZE_BODY,
          }),
        ],
        spacing: { after: 200, line: ABNT.LINE_SPACING },
      })
    );
  }

  // Signature Section
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  docSections.push(
    new Paragraph({ text: '', spacing: { after: 800 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Rio de Janeiro, ${currentDate}.`,
          font: ABNT.FONT_FAMILY,
          size: ABNT.FONT_SIZE_BODY,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 800, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '_____________________________________',
          font: ABNT.FONT_FAMILY,
          size: ABNT.FONT_SIZE_BODY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Assinatura do responsável legal',
          font: ABNT.FONT_FAMILY,
          size: ABNT.FONT_SIZE_BODY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Nome e cargo: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: `${report.responsibleName} - ${report.functionRole}`, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'CNPJ: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: report.providerDocument || '[Não informado]', font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { line: ABNT.LINE_SPACING },
    })
  );

  // Create document with ABNT margins
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: ABNT.MARGIN_TOP,
              right: ABNT.MARGIN_RIGHT,
              bottom: ABNT.MARGIN_BOTTOM,
              left: ABNT.MARGIN_LEFT,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: project.organizationName, font: ABNT.FONT_FAMILY, size: 20 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ', font: ABNT.FONT_FAMILY, size: 20 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: ABNT.FONT_FAMILY, size: 20 }),
                  new TextRun({ text: ' de ', font: ABNT.FONT_FAMILY, size: 20 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: ABNT.FONT_FAMILY, size: 20 }),
                ],
              }),
            ],
          }),
        },
        children: docSections,
      },
    ],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const memberName = report.responsibleName.replace(/\s+/g, '_');
  const filename = `Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, filename);
};
