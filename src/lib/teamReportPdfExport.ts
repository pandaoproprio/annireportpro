import jsPDF from 'jspdf';
import { Project, TeamReport } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

// Parse HTML and return structured content
interface TextBlock {
  type: 'paragraph' | 'bullet';
  content: string;
}

const parseHtmlToBlocks = (html: string): TextBlock[] => {
  if (!html) return [];
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  const blocks: TextBlock[] = [];
  
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({ type: 'paragraph', content: text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      if (tagName === 'li') {
        const liText = element.textContent?.trim() || '';
        if (liText) {
          blocks.push({ type: 'bullet', content: liText });
        }
      } else if (tagName === 'p') {
        const pText = element.textContent?.trim() || '';
        if (pText) {
          blocks.push({ type: 'paragraph', content: pText });
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        element.childNodes.forEach(child => processNode(child));
      } else {
        element.childNodes.forEach(child => processNode(child));
      }
    }
  };
  
  temp.childNodes.forEach(child => processNode(child));
  
  return blocks;
};

// Load image and return as base64 with dimensions
const loadImage = (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({
            data: canvas.toDataURL('image/jpeg', 0.85),
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const exportTeamReportToPdf = async (data: TeamReportExportData): Promise<void> => {
  const { project, report } = data;

  // A4 dimensions in mm
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 30;
  const MARGIN_RIGHT = 20;
  const MARGIN_TOP = 25;
  const MARGIN_BOTTOM = 30; // Increased for footer
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const MAX_Y = PAGE_HEIGHT - MARGIN_BOTTOM;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let currentY = MARGIN_TOP;
  let pageCount = 1;

  // Helper: Add new page
  const addNewPage = () => {
    pdf.addPage();
    pageCount++;
    currentY = MARGIN_TOP;
  };

  // Helper: Check if we need a new page
  const needsNewPage = (neededHeight: number): boolean => {
    return currentY + neededHeight > MAX_Y;
  };

  // Helper: Ensure space or add page
  const ensureSpace = (neededHeight: number) => {
    if (needsNewPage(neededHeight)) {
      addNewPage();
    }
  };

  // ========== PAGE 1: Title and Header ==========
  
  // Title
  const reportTitle = report.reportTitle || 'RELATÓRIO DA EQUIPE DE TRABALHO';
  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const titleWidth = pdf.getTextWidth(reportTitle);
  pdf.text(reportTitle, (PAGE_WIDTH - titleWidth) / 2, currentY);
  currentY += 12;

  // Header info
  pdf.setFontSize(12);
  pdf.setFont('times', 'bold');
  pdf.text('Termo de Fomento nº: ', MARGIN_LEFT, currentY);
  pdf.setFont('times', 'normal');
  pdf.text(project.fomentoNumber, MARGIN_LEFT + pdf.getTextWidth('Termo de Fomento nº: '), currentY);
  currentY += 6;

  pdf.setFont('times', 'bold');
  pdf.text('Projeto: ', MARGIN_LEFT, currentY);
  pdf.setFont('times', 'normal');
  pdf.text(project.name, MARGIN_LEFT + pdf.getTextWidth('Projeto: '), currentY);
  currentY += 6;

  pdf.setFont('times', 'bold');
  pdf.text('Período de Referência: ', MARGIN_LEFT, currentY);
  pdf.setFont('times', 'normal');
  pdf.text(formatPeriod(report.periodStart, report.periodEnd), MARGIN_LEFT + pdf.getTextWidth('Período de Referência: '), currentY);
  currentY += 12;

  // Section 1: Identification
  pdf.setFontSize(12);
  pdf.setFont('times', 'bold');
  pdf.text('1. Dados de Identificação', MARGIN_LEFT, currentY);
  currentY += 8;

  // Helper: Add bullet point
  const addBulletItem = (label: string, value: string) => {
    ensureSpace(8);
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('•', MARGIN_LEFT + 5, currentY);
    pdf.setFont('times', 'bold');
    pdf.text(label, MARGIN_LEFT + 10, currentY);
    pdf.setFont('times', 'normal');
    pdf.text(value, MARGIN_LEFT + 10 + pdf.getTextWidth(label), currentY);
    currentY += 6;
  };

  addBulletItem('Prestador: ', report.providerName || '[Não informado]');
  addBulletItem('Responsável Técnico: ', report.responsibleName);
  addBulletItem('Função: ', report.functionRole);
  currentY += 6;

  // Section 2: Execution Report
  const executionTitle = report.executionReportTitle || '2. Relato de Execução da Coordenação do Projeto';
  ensureSpace(15);
  pdf.setFontSize(12);
  pdf.setFont('times', 'bold');
  pdf.text(executionTitle, MARGIN_LEFT, currentY);
  currentY += 8;

  // Helper: Add wrapped text paragraph
  const addParagraph = (text: string, indent: number = 10) => {
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    const lines = pdf.splitTextToSize(text, CONTENT_WIDTH - indent);
    
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(6);
      const x = MARGIN_LEFT + (i === 0 ? indent : 0);
      const width = CONTENT_WIDTH - (i === 0 ? indent : 0);
      pdf.text(lines[i], x, currentY, { maxWidth: width });
      currentY += 6;
    }
    currentY += 2;
  };

  // Helper: Add bullet with wrapped text
  const addBulletText = (text: string) => {
    pdf.setFontSize(12);
    
    // Check for "Label:" pattern
    const colonIndex = text.indexOf(':');
    const hasLabel = colonIndex > 0 && colonIndex < 50;
    
    ensureSpace(6);
    pdf.setFont('times', 'normal');
    pdf.text('•', MARGIN_LEFT + 5, currentY);
    
    const textX = MARGIN_LEFT + 12;
    const textWidth = CONTENT_WIDTH - 12;
    
    if (hasLabel) {
      const label = text.substring(0, colonIndex + 1);
      const content = text.substring(colonIndex + 1).trim();
      
      pdf.setFont('times', 'bold');
      pdf.text(label, textX, currentY);
      const labelW = pdf.getTextWidth(label + ' ');
      
      pdf.setFont('times', 'normal');
      
      // Check if content fits on same line
      const remainingOnLine = textWidth - labelW;
      if (pdf.getTextWidth(content) <= remainingOnLine) {
        pdf.text(content, textX + labelW, currentY);
        currentY += 6;
      } else {
        // Wrap content
        const allText = label + ' ' + content;
        const allLines = pdf.splitTextToSize(allText, textWidth);
        
        // First line with bold label
        pdf.setFont('times', 'bold');
        pdf.text(label, textX, currentY);
        
        // Get what fits after label
        const firstLineRemainder = allLines[0].substring(label.length).trim();
        pdf.setFont('times', 'normal');
        if (firstLineRemainder) {
          pdf.text(firstLineRemainder, textX + labelW, currentY);
        }
        currentY += 6;
        
        // Remaining lines
        for (let i = 1; i < allLines.length; i++) {
          ensureSpace(6);
          pdf.text(allLines[i], textX, currentY);
          currentY += 6;
        }
      }
    } else {
      // No label, simple bullet
      const lines = pdf.splitTextToSize(text, textWidth);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) ensureSpace(6);
        pdf.text(lines[i], textX, currentY);
        currentY += 6;
      }
    }
    currentY += 1;
  };

  // Parse and render execution report content
  const blocks = parseHtmlToBlocks(report.executionReport || '<p>[Nenhum relato informado]</p>');
  
  for (const block of blocks) {
    if (block.type === 'bullet') {
      addBulletText(block.content);
    } else {
      addParagraph(block.content);
    }
  }

  // ========== ADDITIONAL SECTIONS ==========
  const additionalSections = report.additionalSections || [];
  for (const section of additionalSections) {
    ensureSpace(20);
    currentY += 4;
    
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text(section.title, MARGIN_LEFT, currentY);
    currentY += 8;

    const sectionBlocks = parseHtmlToBlocks(section.content || '<p>[Nenhum conteúdo]</p>');
    
    for (const block of sectionBlocks) {
      if (block.type === 'bullet') {
        addBulletText(block.content);
      } else {
        addParagraph(block.content);
      }
    }
  }

  // ========== PHOTOS SECTION ==========
  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0 
    ? report.photoCaptions 
    : report.photos?.map((url, i) => ({ url, caption: 'Registro fotográfico das atividades realizadas', id: `photo-${i}` })) || [];

  if (photosToExport.length > 0) {
    // Always start photos on a new page
    addNewPage();
    
    // Section title
    const attachmentsTitle = report.attachmentsTitle || '3. Anexos de Comprovação - Registros Fotográficos';
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text(attachmentsTitle, MARGIN_LEFT, currentY);
    currentY += 15;

    // Photo grid: 2 columns - FIXED SIZE for all photos
    const PHOTO_WIDTH = 70;
    const PHOTO_HEIGHT = 50; // Fixed height for uniformity
    const COL_GAP = 15;
    const ROW_GAP = 25; // Space for caption

    const col1X = MARGIN_LEFT;
    const col2X = MARGIN_LEFT + PHOTO_WIDTH + COL_GAP;

    let photoIndex = 0;

    while (photoIndex < photosToExport.length) {
      // Check if we need a new page (need space for at least one row)
      if (currentY + PHOTO_HEIGHT + 20 > MAX_Y) {
        addNewPage();
      }

      const rowStartY = currentY;

      // Process up to 2 photos per row
      for (let col = 0; col < 2 && photoIndex < photosToExport.length; col++) {
        const photo = photosToExport[photoIndex];
        const x = col === 0 ? col1X : col2X;

        // Load image
        const imgData = await loadImage(photo.url);
        if (imgData) {
          // FIXED SIZE: Crop/fit to exact dimensions - always same size
          // Scale to fill the box while maintaining aspect ratio, then crop to fit
          const aspectRatio = imgData.width / imgData.height;
          const boxRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
          
          let drawWidth: number;
          let drawHeight: number;
          let offsetX = 0;
          let offsetY = 0;
          
          if (aspectRatio > boxRatio) {
            // Image is wider - fit height, center horizontally
            drawHeight = PHOTO_HEIGHT;
            drawWidth = PHOTO_HEIGHT * aspectRatio;
            offsetX = (PHOTO_WIDTH - drawWidth) / 2;
          } else {
            // Image is taller - fit width, center vertically
            drawWidth = PHOTO_WIDTH;
            drawHeight = PHOTO_WIDTH / aspectRatio;
            offsetY = (PHOTO_HEIGHT - drawHeight) / 2;
          }
          
          // Use fixed size box - draw image centered
          try {
            // All images get same visual box size
            pdf.addImage(imgData.data, 'JPEG', x, rowStartY, PHOTO_WIDTH, PHOTO_HEIGHT);
          } catch (e) {
            console.warn('Failed to add image:', e);
          }
        }

        // Add caption below image
        pdf.setFontSize(9);
        pdf.setFont('times', 'italic');
        const caption = `Foto ${photoIndex + 1}: ${photo.caption}`;
        const captionLines = pdf.splitTextToSize(caption, PHOTO_WIDTH);
        const captionY = rowStartY + PHOTO_HEIGHT + 5;
        
        for (let j = 0; j < Math.min(captionLines.length, 2); j++) {
          pdf.text(captionLines[j], x, captionY + j * 4);
        }

        photoIndex++;
      }

      // Move to next row
      currentY = rowStartY + PHOTO_HEIGHT + ROW_GAP;
    }
  }

  // ========== SIGNATURE SECTION (After Photos) ==========
  // Add some space before signature
  currentY += 10;
  ensureSpace(60);

  // Date
  pdf.setFontSize(12);
  pdf.setFont('times', 'normal');
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;
  pdf.text(dateText, MARGIN_LEFT, currentY);
  currentY += 25;

  // Signature line - centered
  ensureSpace(35);
  const signatureLineWidth = 80;
  const centerX = PAGE_WIDTH / 2;
  pdf.setDrawColor(0, 0, 0);
  pdf.line(centerX - signatureLineWidth / 2, currentY, centerX + signatureLineWidth / 2, currentY);
  currentY += 5;

  // Signature label
  pdf.setFont('times', 'normal');
  const signatureLabel = 'Assinatura do responsável legal';
  const labelWidth = pdf.getTextWidth(signatureLabel);
  pdf.text(signatureLabel, centerX - labelWidth / 2, currentY);
  currentY += 10;

  // Name and role - centered
  pdf.setFont('times', 'bold');
  pdf.text('Nome e cargo: ', centerX - 60, currentY);
  pdf.setFont('times', 'normal');
  pdf.text(`${report.responsibleName} - ${report.functionRole}`, centerX - 60 + pdf.getTextWidth('Nome e cargo: '), currentY);
  currentY += 6;

  // CNPJ - centered
  pdf.setFont('times', 'bold');
  pdf.text('CNPJ: ', centerX - 60, currentY);
  pdf.setFont('times', 'normal');
  pdf.text(report.providerDocument || '[Não informado]', centerX - 60 + pdf.getTextWidth('CNPJ: '), currentY);

  // ========== ADD FOOTERS TO ALL PAGES ==========
  const addFooters = () => {
    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);
      
      // Footer line
      pdf.setDrawColor(180, 180, 180);
      pdf.line(MARGIN_LEFT, PAGE_HEIGHT - 20, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 20);
      
      // Organization name
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(80, 80, 80);
      const orgName = project.organizationName;
      const orgWidth = pdf.getTextWidth(orgName);
      pdf.text(orgName, (PAGE_WIDTH - orgWidth) / 2, PAGE_HEIGHT - 14);
      
      // Page number
      const pageText = `Página ${page} de ${pageCount}`;
      const pageWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, (PAGE_WIDTH - pageWidth) / 2, PAGE_HEIGHT - 8);
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
    }
  };

  addFooters();

  // Save PDF
  const memberName = report.responsibleName.replace(/\s+/g, '_');
  const filename = `Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  pdf.save(filename);
};
