import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Footer,
  PageNumber,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { Project, ReportSection } from '@/types';
import { JustificationReport, AttachmentFileData } from '@/types/justificationReport';

const ABNT = {
  FONT_FAMILY: 'Times New Roman',
  FONT_SIZE_BODY: 24,
  FONT_SIZE_HEADING: 28,
  FONT_SIZE_TITLE: 32,
  LINE_SPACING: 360,
  FIRST_LINE_INDENT: convertInchesToTwip(0.5),
  MARGIN_LEFT: 1701,
  MARGIN_RIGHT: 1134,
  MARGIN_TOP: 1701,
  MARGIN_BOTTOM: 1134,
};

const parseHtmlToDocxParagraphs = (html: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  if (!html || html.trim() === '') return paragraphs;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const processNode = (node: Node, isBold = false, isItalic = false, isUnderline = false): TextRun[] => {
    const runs: TextRun[] = [];
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.trim()) {
          runs.push(new TextRun({
            text, bold: isBold, italics: isItalic,
            underline: isUnderline ? {} : undefined,
            font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY,
          }));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        let newBold = isBold, newItalic = isItalic, newUnderline = isUnderline;
        if (tag === 'strong' || tag === 'b') newBold = true;
        if (tag === 'em' || tag === 'i') newItalic = true;
        if (tag === 'u') newUnderline = true;
        runs.push(...processNode(el, newBold, newItalic, newUnderline));
      }
    });
    return runs;
  };

  const processElement = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    if (tag === 'p') {
      const runs = processNode(element);
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({
          children: runs,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: ABNT.LINE_SPACING },
          indent: { firstLine: ABNT.FIRST_LINE_INDENT },
        }));
      }
    } else if (tag === 'ul') {
      element.querySelectorAll(':scope > li').forEach((li) => {
        const runs = processNode(li);
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '• ', font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }), ...runs],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100, line: ABNT.LINE_SPACING },
          indent: { left: 720 },
        }));
      });
    } else if (tag === 'ol') {
      let counter = 1;
      element.querySelectorAll(':scope > li').forEach((li) => {
        const runs = processNode(li);
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: `${counter}. `, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }), ...runs],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100, line: ABNT.LINE_SPACING },
          indent: { left: 720 },
        }));
        counter++;
      });
    }
  };

  doc.body.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      processElement(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: child.textContent.trim(), font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: ABNT.LINE_SPACING },
        indent: { firstLine: ABNT.FIRST_LINE_INDENT },
      }));
    }
  });
  return paragraphs;
};

export interface JustificationExportData {
  project: Project;
  report: JustificationReport;
  sections?: ReportSection[];
  attachmentFiles?: AttachmentFileData[];
}

const DEFAULT_SECTION_ORDER = [
  { key: 'objectSection', title: 'DO OBJETO DO TERMO ADITIVO' },
  { key: 'justificationSection', title: 'DA JUSTIFICATIVA PARA A PRORROGAÇÃO' },
  { key: 'executedActionsSection', title: 'DAS AÇÕES JÁ EXECUTADAS (RESULTADOS PARCIAIS)' },
  { key: 'futureActionsSection', title: 'DAS AÇÕES FUTURAS PREVISTAS NO PERÍODO DE PRORROGAÇÃO' },
  { key: 'requestedDeadlineSection', title: 'DO PRAZO SOLICITADO' },
  { key: 'attachmentsSection', title: 'ANEXOS' },
] as const;

export const exportJustificationToDocx = async (data: JustificationExportData) => {
  const { project, report, sections: dynamicSections, attachmentFiles } = data;
  const docSections: Paragraph[] = [];

  // Title
  docSections.push(new Paragraph({
    children: [new TextRun({
      text: 'JUSTIFICATIVA PARA PRORROGAÇÃO DE PRAZO DO PROJETO',
      bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_TITLE,
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400, line: ABNT.LINE_SPACING },
  }));

  // Header
  docSections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Projeto: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: project.name, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      spacing: { after: 100, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Termo de Fomento nº: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: project.fomentoNumber, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      spacing: { after: 100, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Organização: ', bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
        new TextRun({ text: project.organizationName, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
      ],
      spacing: { after: 400, line: ABNT.LINE_SPACING },
    }),
  );

  // Addressee
  docSections.push(new Paragraph({
    children: [new TextRun({
      text: `Ao ${project.funder},`,
      font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY,
    })],
    spacing: { after: 300, line: ABNT.LINE_SPACING },
  }));

  // Sections - respect ordering and visibility from dynamic sections
  if (dynamicSections && dynamicSections.length > 0) {
    const visibleSections = dynamicSections.filter(s => s.isVisible);
    visibleSections.forEach((section, idx) => {
      const sectionNum = idx + 1;
      const content = section.type === 'custom'
        ? section.content || ''
        : report[section.key as keyof JustificationReport] as string || '';

      docSections.push(new Paragraph({
        children: [new TextRun({
          text: `${sectionNum}. ${section.title}`, bold: true,
          font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_HEADING,
        })],
        spacing: { before: 400, after: 200, line: ABNT.LINE_SPACING },
      }));
      docSections.push(...parseHtmlToDocxParagraphs(content));
    });
  } else {
    // Fallback to default order
    DEFAULT_SECTION_ORDER.forEach((section, idx) => {
      const content = report[section.key as keyof JustificationReport] as string;
      docSections.push(new Paragraph({
        children: [new TextRun({
          text: `${idx + 1}. ${section.title}`, bold: true,
          font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_HEADING,
        })],
        spacing: { before: 400, after: 200, line: ABNT.LINE_SPACING },
      }));
      docSections.push(...parseHtmlToDocxParagraphs(content));
    });
  }

  // Add attachment files list if any
  if (attachmentFiles && attachmentFiles.length > 0) {
    docSections.push(new Paragraph({
      children: [new TextRun({
        text: 'Documentos anexados:', bold: true,
        font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY,
      })],
      spacing: { before: 200, after: 100, line: ABNT.LINE_SPACING },
    }));
    attachmentFiles.forEach((file, idx) => {
      docSections.push(new Paragraph({
        children: [new TextRun({
          text: `${idx + 1}. ${file.name}`,
          font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY,
        })],
        spacing: { after: 50, line: ABNT.LINE_SPACING },
        indent: { left: 720 },
      }));
    });
  }

  // Signature
  const currentDate = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  docSections.push(
    new Paragraph({ text: '', spacing: { after: 800 } }),
    new Paragraph({
      children: [new TextRun({ text: `Rio de Janeiro, ${currentDate}.`, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY })],
      spacing: { after: 800, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [new TextRun({ text: '_____________________________________', font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY })],
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Assinatura do responsável legal', font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY })],
      alignment: AlignmentType.CENTER, spacing: { after: 300, line: ABNT.LINE_SPACING },
    }),
    new Paragraph({
      children: [new TextRun({ text: project.organizationName, bold: true, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY })],
      alignment: AlignmentType.CENTER, spacing: { line: ABNT.LINE_SPACING },
    }),
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: ABNT.MARGIN_TOP, right: ABNT.MARGIN_RIGHT, bottom: ABNT.MARGIN_BOTTOM, left: ABNT.MARGIN_LEFT } },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: project.organizationName, font: ABNT.FONT_FAMILY, size: 20 })],
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
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Justificativa_Prorrogacao_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, filename);
};
