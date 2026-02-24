import jsPDF from 'jspdf';
import { Project } from '@/types';
import { JustificationReport } from '@/types/justificationReport';

interface JustificationExportData {
  project: Project;
  report: JustificationReport;
}

const ABNT = {
  MARGIN_LEFT: 30,
  MARGIN_RIGHT: 20,
  MARGIN_TOP: 30,
  MARGIN_BOTTOM: 20,
  FONT: 'times',
  FONT_SIZE_BODY: 12,
  FONT_SIZE_HEADING: 14,
  FONT_SIZE_TITLE: 16,
  LINE_HEIGHT: 7,
};

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
  const pageWidth = 210;
  const contentWidth = pageWidth - ABNT.MARGIN_LEFT - ABNT.MARGIN_RIGHT;
  const pageHeight = 297;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = ABNT.MARGIN_TOP;

  const addFooter = (pageNum: number, totalPages: number) => {
    // Footer line + org name
    pdf.setFont(ABNT.FONT, 'normal');
    pdf.setFontSize(10);
    pdf.setDrawColor(180, 180, 180);
    const footerY = pageHeight - 15;
    pdf.line(ABNT.MARGIN_LEFT, footerY, pageWidth - ABNT.MARGIN_RIGHT, footerY);
    pdf.setTextColor(80, 80, 80);
    pdf.text(project.organizationName, pageWidth / 2, footerY + 5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);

    // Page number – top right, 2 cm from edge (skip page 1)
    if (pageNum > 1) {
      pdf.setFontSize(ABNT.FONT_SIZE_BODY);
      pdf.setFont(ABNT.FONT, 'normal');
      pdf.text(String(pageNum), pageWidth - ABNT.MARGIN_RIGHT, 15, { align: 'right' });
    }
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - ABNT.MARGIN_BOTTOM) {
      pdf.addPage();
      y = ABNT.MARGIN_TOP;
    }
  };

  const writeWrappedText = (text: string, fontSize: number, fontStyle: string = 'normal', indent = 0) => {
    pdf.setFont(ABNT.FONT, fontStyle);
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, contentWidth - indent);
    for (const line of lines) {
      checkPageBreak(ABNT.LINE_HEIGHT);
      pdf.text(line, ABNT.MARGIN_LEFT + indent, y);
      y += ABNT.LINE_HEIGHT;
    }
  };

  const parseHtmlAndWrite = (html: string) => {
    if (!html || html.trim() === '') return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const processElement = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'p') {
        const text = el.textContent?.trim() || '';
        if (text) writeWrappedText(text, ABNT.FONT_SIZE_BODY, 'normal', 0);
        y += 2;
      } else if (tag === 'ul') {
        el.querySelectorAll(':scope > li').forEach((li) => {
          const text = `• ${li.textContent?.trim() || ''}`;
          writeWrappedText(text, ABNT.FONT_SIZE_BODY, 'normal', 5);
        });
        y += 2;
      } else if (tag === 'ol') {
        let counter = 1;
        el.querySelectorAll(':scope > li').forEach((li) => {
          const text = `${counter}. ${li.textContent?.trim() || ''}`;
          writeWrappedText(text, ABNT.FONT_SIZE_BODY, 'normal', 5);
          counter++;
        });
        y += 2;
      }
    };

    doc.body.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        processElement(child as Element);
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        writeWrappedText(child.textContent.trim(), ABNT.FONT_SIZE_BODY);
        y += 2;
      }
    });
  };

  // Title
  pdf.setFont(ABNT.FONT, 'bold');
  pdf.setFontSize(ABNT.FONT_SIZE_TITLE);
  const titleLines = pdf.splitTextToSize('JUSTIFICATIVA PARA PRORROGAÇÃO DE PRAZO DO PROJETO', contentWidth);
  for (const line of titleLines) {
    pdf.text(line, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }
  y += 6;

  // Header info
  const headerItems = [
    { label: 'Projeto: ', value: project.name },
    { label: 'Termo de Fomento nº: ', value: project.fomentoNumber },
    { label: 'Organização: ', value: project.organizationName },
  ];
  for (const item of headerItems) {
    pdf.setFont(ABNT.FONT, 'bold');
    pdf.setFontSize(ABNT.FONT_SIZE_BODY);
    const labelWidth = pdf.getTextWidth(item.label);
    pdf.text(item.label, ABNT.MARGIN_LEFT, y);
    pdf.setFont(ABNT.FONT, 'normal');
    pdf.text(item.value, ABNT.MARGIN_LEFT + labelWidth, y);
    y += ABNT.LINE_HEIGHT;
  }
  y += 6;

  // Addressee
  writeWrappedText(`Ao ${project.funder},`, ABNT.FONT_SIZE_BODY);
  y += 6;

  // Sections
  for (const section of sectionDefs) {
    checkPageBreak(20);
    writeWrappedText(section.title, ABNT.FONT_SIZE_HEADING, 'bold');
    y += 3;
    parseHtmlAndWrite(report[section.key]);
    y += 4;
  }

  // Signature
  y += 15;
  checkPageBreak(50);
  const currentDate = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  writeWrappedText(`Rio de Janeiro, ${currentDate}.`, ABNT.FONT_SIZE_BODY);
  y += 20;

  pdf.setFont(ABNT.FONT, 'normal');
  pdf.setFontSize(ABNT.FONT_SIZE_BODY);
  pdf.text('_____________________________________', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('Assinatura do responsável legal', pageWidth / 2, y, { align: 'center' });
  y += 10;
  pdf.setFont(ABNT.FONT, 'bold');
  pdf.text(project.organizationName, pageWidth / 2, y, { align: 'center' });

  // Add footer to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(i, totalPages);
  }

  const filename = `Justificativa_Prorrogacao_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};
