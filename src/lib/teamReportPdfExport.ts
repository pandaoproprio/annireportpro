import jsPDF from 'jspdf';
import { Project, TeamReport } from '@/types';

interface TeamReportExportData {
  project: Project;
  report: TeamReport;
}

const formatPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  return `[${startMonth} à ${endMonth}]`;
};

const getCurrentDate = () => {
  return new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Helper to strip HTML tags and convert to plain text with line breaks
const htmlToPlainText = (html: string): string => {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Replace block elements with line breaks
  const blockElements = temp.querySelectorAll('p, div, br, li, h1, h2, h3, h4, h5, h6');
  blockElements.forEach((el) => {
    if (el.tagName === 'LI') {
      el.textContent = '• ' + (el.textContent || '');
    }
    el.insertAdjacentText('afterend', '\n');
  });
  
  return temp.textContent?.trim() || '';
};

// Helper to wrap text and return lines
const wrapText = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  paragraphs.forEach((paragraph) => {
    if (paragraph.trim() === '') {
      lines.push('');
      return;
    }
    const wrappedLines = pdf.splitTextToSize(paragraph, maxWidth);
    lines.push(...wrappedLines);
  });
  
  return lines;
};

// Helper to add footer to current page
const addFooter = (pdf: jsPDF, pageNum: number, totalPages: number, orgName: string) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  pdf.setFont('times', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  
  // Horizontal line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(30, pageHeight - 20, pageWidth - 20, pageHeight - 20);
  
  // Organization name
  const orgTextWidth = pdf.getTextWidth(orgName);
  pdf.text(orgName, (pageWidth - orgTextWidth) / 2, pageHeight - 14);
  
  // Page number
  const pageText = `Página ${pageNum} de ${totalPages}`;
  const pageTextWidth = pdf.getTextWidth(pageText);
  pdf.text(pageText, (pageWidth - pageTextWidth) / 2, pageHeight - 9);
};

export const exportTeamReportToPdf = async (data: TeamReportExportData): Promise<void> => {
  const { project, report } = data;

  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0 
    ? report.photoCaptions 
    : report.photos?.map((url) => ({ url, caption: 'Registro fotográfico das atividades realizadas' })) || [];

  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 30;
  const marginRight = 20;
  const marginTop = 30;
  const marginBottom = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxY = pageHeight - marginBottom;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  let y = marginTop;
  let currentPage = 1;
  const pages: number[] = [1];

  // Helper to check if we need a new page
  const checkNewPage = (neededHeight: number): boolean => {
    if (y + neededHeight > maxY) {
      pdf.addPage();
      currentPage++;
      pages.push(currentPage);
      y = marginTop;
      return true;
    }
    return false;
  };

  // ========== TITLE ==========
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  
  const title = 'RELATÓRIO DA EQUIPE DE TRABALHO';
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, (pageWidth - titleWidth) / 2, y);
  y += 15;

  // ========== HEADER INFO ==========
  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);
  
  pdf.setFont('times', 'bold');
  pdf.text('Termo de Fomento nº: ', marginLeft, y);
  pdf.setFont('times', 'normal');
  pdf.text(project.fomentoNumber, marginLeft + pdf.getTextWidth('Termo de Fomento nº: '), y);
  y += 6;

  pdf.setFont('times', 'bold');
  pdf.text('Projeto: ', marginLeft, y);
  pdf.setFont('times', 'normal');
  pdf.text(project.name, marginLeft + pdf.getTextWidth('Projeto: '), y);
  y += 6;

  pdf.setFont('times', 'bold');
  pdf.text('Período de Referência: ', marginLeft, y);
  pdf.setFont('times', 'normal');
  pdf.text(formatPeriod(report.periodStart, report.periodEnd), marginLeft + pdf.getTextWidth('Período de Referência: '), y);
  y += 15;

  // ========== SECTION 1: IDENTIFICATION ==========
  pdf.setFont('times', 'bold');
  pdf.setFontSize(14);
  pdf.text('1. Dados de Identificação', marginLeft, y);
  y += 10;

  pdf.setFontSize(12);
  const identificationItems = [
    { label: 'Prestador: ', value: report.providerName || '[Não informado]' },
    { label: 'Responsável Técnico: ', value: report.responsibleName },
    { label: 'Função: ', value: report.functionRole },
  ];

  identificationItems.forEach((item) => {
    checkNewPage(8);
    pdf.setFont('times', 'bold');
    pdf.text('• ' + item.label, marginLeft + 5, y);
    pdf.setFont('times', 'normal');
    pdf.text(item.value, marginLeft + 5 + pdf.getTextWidth('• ' + item.label), y);
    y += 7;
  });
  y += 8;

  // ========== SECTION 2: EXECUTION REPORT ==========
  checkNewPage(20);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(14);
  pdf.text('2. Relato de Execução da Coordenação do Projeto', marginLeft, y);
  y += 10;

  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);
  
  const reportText = htmlToPlainText(report.executionReport || '[Nenhum relato informado]');
  const reportLines = wrapText(pdf, reportText, contentWidth);
  
  const lineHeight = 6;
  reportLines.forEach((line) => {
    checkNewPage(lineHeight);
    pdf.text(line, marginLeft, y, { align: 'justify', maxWidth: contentWidth });
    y += lineHeight;
  });
  y += 10;

  // ========== SECTION 3: SIGNATURE ==========
  checkNewPage(60);
  
  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);
  pdf.text(`Rio de Janeiro, ${getCurrentDate()}.`, marginLeft, y);
  y += 40;

  // Signature line
  const signatureLineWidth = 80;
  const signatureCenterX = pageWidth / 2;
  pdf.line(signatureCenterX - signatureLineWidth / 2, y, signatureCenterX + signatureLineWidth / 2, y);
  y += 6;

  pdf.setFont('times', 'normal');
  let signatureText = 'Assinatura do responsável legal';
  let signatureTextWidth = pdf.getTextWidth(signatureText);
  pdf.text(signatureText, (pageWidth - signatureTextWidth) / 2, y);
  y += 10;

  pdf.setFont('times', 'bold');
  const nameAndRole = `Nome e cargo: `;
  pdf.text(nameAndRole, marginLeft, y);
  pdf.setFont('times', 'normal');
  pdf.text(`${report.responsibleName} - ${report.functionRole}`, marginLeft + pdf.getTextWidth(nameAndRole), y);
  y += 7;

  pdf.setFont('times', 'bold');
  pdf.text('CNPJ: ', marginLeft, y);
  pdf.setFont('times', 'normal');
  pdf.text(report.providerDocument || '[Não informado]', marginLeft + pdf.getTextWidth('CNPJ: '), y);

  // ========== SECTION 4: PHOTOS ==========
  if (photosToExport.length > 0) {
    // Always start photos on a new page
    pdf.addPage();
    currentPage++;
    pages.push(currentPage);
    y = marginTop;

    pdf.setFont('times', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('3. Anexos de Comprovação - Registros Fotográficos', marginLeft, y);
    y += 15;

    const photoWidth = 140;
    const photoHeight = 90;
    const captionHeight = 15;
    const photoSpacing = 20;

    for (let i = 0; i < photosToExport.length; i++) {
      const photo = photosToExport[i];
      const photoIndex = i + 1;

      // Check if we need a new page (photo + caption)
      if (y + photoHeight + captionHeight + 10 > maxY) {
        pdf.addPage();
        currentPage++;
        pages.push(currentPage);
        y = marginTop;
      }

      try {
        // Load image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = photo.url;
        });

        // Calculate centered position
        const xPosition = (pageWidth - photoWidth) / 2;

        // Add image to PDF
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Set canvas size to maintain aspect ratio
          const aspectRatio = img.width / img.height;
          let drawWidth = photoWidth * 3; // Scale up for quality
          let drawHeight = drawWidth / aspectRatio;
          
          if (drawHeight > photoHeight * 3) {
            drawHeight = photoHeight * 3;
            drawWidth = drawHeight * aspectRatio;
          }
          
          canvas.width = drawWidth;
          canvas.height = drawHeight;
          ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
          
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          
          // Calculate actual display dimensions maintaining aspect ratio
          let displayWidth = photoWidth;
          let displayHeight = displayWidth / aspectRatio;
          
          if (displayHeight > photoHeight) {
            displayHeight = photoHeight;
            displayWidth = displayHeight * aspectRatio;
          }
          
          const actualX = (pageWidth - displayWidth) / 2;
          pdf.addImage(imgData, 'JPEG', actualX, y, displayWidth, displayHeight);
          y += displayHeight + 5;
        }

        // Add caption
        pdf.setFont('times', 'italic');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        const caption = `Foto ${photoIndex}: ${photo.caption}`;
        const captionLines = pdf.splitTextToSize(caption, contentWidth);
        
        captionLines.forEach((line: string) => {
          const lineWidth = pdf.getTextWidth(line);
          pdf.text(line, (pageWidth - lineWidth) / 2, y);
          y += 5;
        });

        y += photoSpacing;

      } catch (error) {
        console.error(`Failed to load photo ${photoIndex}:`, error);
        
        // Add placeholder for failed image
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`[Foto ${photoIndex} não disponível]`, pageWidth / 2, y, { align: 'center' });
        y += photoHeight + captionHeight + photoSpacing;
      }
    }
  }

  // ========== ADD FOOTERS TO ALL PAGES ==========
  const totalPages = (pdf as any).internal.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, project.organizationName);
  }

  // ========== SAVE PDF ==========
  const memberName = report.responsibleName.replace(/\s+/g, '_');
  const filename = `Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  pdf.save(filename);
};
