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
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { Project, TeamReport } from '@/types';

interface TeamReportExportData {
  project: Project;
  report: TeamReport;
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
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

  // Header
  docSections.push(
    new Paragraph({
      text: 'RELATÓRIO DA EQUIPE DE TRABALHO',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: `Termo de Fomento nº: ${project.fomentoNumber}`,
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `Projeto: ${project.name}`,
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `Período de Referência: ${formatPeriod(report.periodStart, report.periodEnd)}`,
      alignment: AlignmentType.LEFT,
      spacing: { after: 400 },
    })
  );

  // Section 1: Identification Data
  docSections.push(
    new Paragraph({
      text: '1. Dados de Identificação',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Prestador: ', bold: true }),
        new TextRun({ text: report.providerName }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Responsável Técnico: ', bold: true }),
        new TextRun({ text: report.responsibleName }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Função: ', bold: true }),
        new TextRun({ text: report.functionRole }),
      ],
      spacing: { after: 300 },
    })
  );

  // Section 2: Execution Report
  docSections.push(
    new Paragraph({
      text: '2. Relato de Execução da Coordenação do Projeto',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  );

  // Split report text into paragraphs
  const reportParagraphs = report.executionReport.split('\n').filter(p => p.trim());
  for (const para of reportParagraphs) {
    docSections.push(
      new Paragraph({
        text: para.trim(),
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
      })
    );
  }

  // Section 3: Attachments (Photos)
  if (report.photos && report.photos.length > 0) {
    docSections.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        text: '3. Anexos de Comprovação',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `${report.photos.length} registro(s) fotográfico(s) anexado(s).`,
        spacing: { after: 200 },
        children: [
          new TextRun({ 
            text: `${report.photos.length} registro(s) fotográfico(s) anexado(s).`,
            italics: true,
          }),
        ],
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
      text: `Rio de Janeiro, ${currentDate}.`,
      alignment: AlignmentType.LEFT,
      spacing: { after: 600 },
    }),
    new Paragraph({
      text: '_____________________________________',
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: 'Assinatura do responsável legal',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Nome e cargo: ', bold: true }),
        new TextRun({ text: report.responsibleName }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'CNPJ: ', bold: true }),
        new TextRun({ text: report.providerDocument || '[Não informado]' }),
      ],
      alignment: AlignmentType.LEFT,
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: project.organizationName, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ', size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                  new TextRun({ text: ' de ', size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
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
