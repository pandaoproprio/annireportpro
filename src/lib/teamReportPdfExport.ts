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

// Strip HTML tags and convert to plain text with bullet handling
const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Process list items to add bullet points
  const listItems = temp.querySelectorAll('li');
  listItems.forEach(li => {
    li.textContent = '• ' + (li.textContent || '');
  });
  
  // Get text content
  let text = temp.textContent || temp.innerText || '';
  
  // Clean up extra whitespace but preserve paragraph breaks
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
};

// Parse HTML and return structured content with formatting hints
interface TextBlock {
  type: 'paragraph' | 'bullet';
  content: string;
  isBold?: boolean;
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
        // Get the full text content of the list item
        const liText = element.textContent?.trim() || '';
        if (liText) {
          // Check if it starts with bold text
          const firstStrong = element.querySelector('strong, b');
          if (firstStrong && liText.startsWith(firstStrong.textContent || '')) {
            blocks.push({ 
              type: 'bullet', 
              content: liText,
              isBold: false // We'll handle bold inline
            });
          } else {
            blocks.push({ type: 'bullet', content: liText });
          }
        }
      } else if (tagName === 'p') {
        const pText = element.textContent?.trim() || '';
        if (pText) {
          blocks.push({ type: 'paragraph', content: pText });
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        // Process children (li items)
        element.childNodes.forEach(child => processNode(child));
      } else {
        // For other elements, process children
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
  const MARGIN_BOTTOM = 25;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let currentY = MARGIN_TOP;
  let totalPages = 1;

  // Helper: Check if we need a new page
  const checkNewPage = (neededHeight: number): boolean => {
    if (currentY + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
      pdf.addPage();
      totalPages++;
      currentY = MARGIN_TOP;
      return true;
    }
    return false;
  };

  // Helper: Add text with word wrap
  const addText = (text: string, fontSize: number, options: { 
    bold?: boolean; 
    italic?: boolean;
    align?: 'left' | 'center' | 'justify';
    indent?: number;
  } = {}): void => {
    const { bold = false, italic = false, align = 'left', indent = 0 } = options;
    
    pdf.setFontSize(fontSize);
    pdf.setFont('times', bold ? 'bold' : (italic ? 'italic' : 'normal'));
    
    const effectiveWidth = CONTENT_WIDTH - indent;
    const lines = pdf.splitTextToSize(text, effectiveWidth);
    const lineHeight = fontSize * 0.5; // Approximate line height in mm
    
    for (const line of lines) {
      checkNewPage(lineHeight);
      
      let x = MARGIN_LEFT + indent;
      if (align === 'center') {
        const textWidth = pdf.getTextWidth(line);
        x = (PAGE_WIDTH - textWidth) / 2;
      }
      
      pdf.text(line, x, currentY, { align: align === 'justify' ? 'justify' : 'left', maxWidth: effectiveWidth });
      currentY += lineHeight;
    }
  };

  // Helper: Add bullet point
  const addBullet = (text: string, fontSize: number): void => {
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'normal');
    
    const bulletIndent = 8;
    const textIndent = 15;
    const effectiveWidth = CONTENT_WIDTH - textIndent;
    
    // Check for bold prefix (e.g., "**Label:** content" pattern)
    const boldMatch = text.match(/^([^:]+:)\s*(.*)$/);
    
    // Add bullet
    checkNewPage(6);
    pdf.text('•', MARGIN_LEFT + bulletIndent, currentY);
    
    if (boldMatch) {
      // Bold label + normal content
      const label = boldMatch[1];
      const content = boldMatch[2];
      
      pdf.setFont('times', 'bold');
      const labelWidth = pdf.getTextWidth(label + ' ');
      pdf.text(label, MARGIN_LEFT + textIndent, currentY);
      
      pdf.setFont('times', 'normal');
      
      // Check if content fits on same line
      const remainingWidth = effectiveWidth - labelWidth;
      if (pdf.getTextWidth(content) <= remainingWidth) {
        pdf.text(content, MARGIN_LEFT + textIndent + labelWidth, currentY);
        currentY += fontSize * 0.5;
      } else {
        // Content needs to wrap
        const fullText = label + ' ' + content;
        const lines = pdf.splitTextToSize(fullText, effectiveWidth);
        
        // First line already added partially, redo
        currentY -= 0; // Stay on same line
        pdf.setFont('times', 'bold');
        pdf.text(label, MARGIN_LEFT + textIndent, currentY);
        pdf.setFont('times', 'normal');
        
        // Calculate where content starts
        let contentOnFirstLine = '';
        const firstLineRemainder = effectiveWidth - labelWidth;
        const words = content.split(' ');
        let currentWidth = 0;
        
        for (const word of words) {
          const wordWidth = pdf.getTextWidth(word + ' ');
          if (currentWidth + wordWidth <= firstLineRemainder) {
            contentOnFirstLine += word + ' ';
            currentWidth += wordWidth;
          } else {
            break;
          }
        }
        
        if (contentOnFirstLine) {
          pdf.text(contentOnFirstLine.trim(), MARGIN_LEFT + textIndent + labelWidth, currentY);
        }
        
        currentY += fontSize * 0.5;
        
        // Remaining content
        const remainingContent = content.substring(contentOnFirstLine.length).trim();
        if (remainingContent) {
          const remainingLines = pdf.splitTextToSize(remainingContent, effectiveWidth);
          for (const line of remainingLines) {
            checkNewPage(fontSize * 0.5);
            pdf.text(line, MARGIN_LEFT + textIndent, currentY);
            currentY += fontSize * 0.5;
          }
        }
      }
    } else {
      // Simple bullet without bold
      const lines = pdf.splitTextToSize(text, effectiveWidth);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          checkNewPage(fontSize * 0.5);
        }
        pdf.text(lines[i], MARGIN_LEFT + textIndent, currentY);
        currentY += fontSize * 0.5;
      }
    }
  };

  // ========== PAGE 1: Title and Content ==========
  
  // Title - RELATÓRIO DA EQUIPE DE TRABALHO
  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const title = 'RELATÓRIO DA EQUIPE DE TRABALHO';
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, (PAGE_WIDTH - titleWidth) / 2, currentY);
  currentY += 15;

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

  // Bullets for identification
  addBullet(`Prestador: ${report.providerName || '[Não informado]'}`, 12);
  currentY += 2;
  addBullet(`Responsável Técnico: ${report.responsibleName}`, 12);
  currentY += 2;
  addBullet(`Função: ${report.functionRole}`, 12);
  currentY += 10;

  // Section 2: Execution Report
  pdf.setFontSize(12);
  pdf.setFont('times', 'bold');
  pdf.text('2. Relato de Execução da Coordenação do Projeto', MARGIN_LEFT, currentY);
  currentY += 10;

  // Parse and render execution report content
  const blocks = parseHtmlToBlocks(report.executionReport || '<p>[Nenhum relato informado]</p>');
  
  for (const block of blocks) {
    if (block.type === 'bullet') {
      addBullet(block.content, 12);
      currentY += 2;
    } else {
      // Paragraph - justified text
      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      
      const lines = pdf.splitTextToSize(block.content, CONTENT_WIDTH);
      const lineHeight = 6;
      
      // First line indent for paragraphs
      for (let i = 0; i < lines.length; i++) {
        checkNewPage(lineHeight);
        const indent = i === 0 ? 10 : 0; // First line indent
        pdf.text(lines[i], MARGIN_LEFT + indent, currentY, { maxWidth: CONTENT_WIDTH - indent });
        currentY += lineHeight;
      }
      currentY += 4; // Paragraph spacing
    }
  }

  // ========== PHOTOS SECTION ==========
  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0 
    ? report.photoCaptions 
    : report.photos?.map((url) => ({ url, caption: 'Registro fotográfico das atividades realizadas', id: url })) || [];

  if (photosToExport.length > 0) {
    // Check if we need new page for photos section
    checkNewPage(50);
    
    // Section 3: Photos
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text('3. Anexos de Comprovação', MARGIN_LEFT, currentY);
    currentY += 10;

    // Grid layout: 2 columns
    const PHOTO_WIDTH = 75; // mm
    const PHOTO_HEIGHT = 50; // mm
    const COLUMN_GAP = 10;
    const ROW_GAP = 25; // Space for caption
    
    let col = 0;
    let rowStartY = currentY;

    for (let i = 0; i < photosToExport.length; i++) {
      const photo = photosToExport[i];
      
      // Calculate position
      const x = MARGIN_LEFT + col * (PHOTO_WIDTH + COLUMN_GAP);
      
      // Check if we need new page
      if (currentY + PHOTO_HEIGHT + 15 > PAGE_HEIGHT - MARGIN_BOTTOM) {
        pdf.addPage();
        totalPages++;
        currentY = MARGIN_TOP;
        rowStartY = currentY;
        col = 0;
      }
      
      // Load and add image
      const imgData = await loadImage(photo.url);
      if (imgData) {
        // Calculate aspect ratio fit
        const aspectRatio = imgData.width / imgData.height;
        let drawWidth = PHOTO_WIDTH;
        let drawHeight = PHOTO_WIDTH / aspectRatio;
        
        if (drawHeight > PHOTO_HEIGHT) {
          drawHeight = PHOTO_HEIGHT;
          drawWidth = PHOTO_HEIGHT * aspectRatio;
        }
        
        // Center image in cell
        const offsetX = (PHOTO_WIDTH - drawWidth) / 2;
        const offsetY = (PHOTO_HEIGHT - drawHeight) / 2;
        
        try {
          pdf.addImage(imgData.data, 'JPEG', x + offsetX, rowStartY + offsetY, drawWidth, drawHeight);
        } catch (e) {
          console.warn('Failed to add image:', e);
        }
      }
      
      // Add caption below
      pdf.setFontSize(9);
      pdf.setFont('times', 'italic');
      const caption = `Foto ${i + 1}: ${photo.caption}`;
      const captionLines = pdf.splitTextToSize(caption, PHOTO_WIDTH);
      const captionY = rowStartY + PHOTO_HEIGHT + 3;
      
      for (let j = 0; j < captionLines.length; j++) {
        pdf.text(captionLines[j], x, captionY + j * 4, { maxWidth: PHOTO_WIDTH });
      }
      
      col++;
      if (col >= 2) {
        col = 0;
        rowStartY += PHOTO_HEIGHT + ROW_GAP;
        currentY = rowStartY;
      }
    }
    
    // Update currentY after photos
    if (col > 0) {
      // Last row wasn't complete
      currentY = rowStartY + PHOTO_HEIGHT + ROW_GAP;
    }
  }

  // ========== SIGNATURE SECTION ==========
  // Ensure signature is at bottom or on new page with enough space
  const signatureHeight = 60;
  
  if (currentY + signatureHeight > PAGE_HEIGHT - MARGIN_BOTTOM - 20) {
    // Need more space - check if we should add page or just leave space
    if (currentY > PAGE_HEIGHT - MARGIN_BOTTOM - 80) {
      pdf.addPage();
      totalPages++;
      currentY = MARGIN_TOP + 40;
    }
  } else {
    currentY += 20;
  }

  // Date
  pdf.setFontSize(12);
  pdf.setFont('times', 'normal');
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;
  pdf.text(dateText, MARGIN_LEFT, currentY);
  currentY += 30;

  // Signature line
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

  // Name and role
  pdf.setFont('times', 'bold');
  const nameAndRole = `Nome e cargo: `;
  pdf.text(nameAndRole, centerX - 50, currentY);
  pdf.setFont('times', 'normal');
  pdf.text(`${report.responsibleName} - ${report.functionRole}`, centerX - 50 + pdf.getTextWidth(nameAndRole), currentY);
  currentY += 6;

  // CNPJ
  pdf.setFont('times', 'bold');
  const cnpjLabel = 'CNPJ: ';
  pdf.text(cnpjLabel, centerX - 50, currentY);
  pdf.setFont('times', 'normal');
  pdf.text(report.providerDocument || '[Não informado]', centerX - 50 + pdf.getTextWidth(cnpjLabel), currentY);

  // ========== ADD FOOTERS TO ALL PAGES ==========
  const addFooters = () => {
    for (let page = 1; page <= totalPages; page++) {
      pdf.setPage(page);
      
      // Footer line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(MARGIN_LEFT, PAGE_HEIGHT - 18, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 18);
      
      // Organization name
      pdf.setFontSize(9);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(100, 100, 100);
      const orgName = project.organizationName;
      const orgWidth = pdf.getTextWidth(orgName);
      pdf.text(orgName, (PAGE_WIDTH - orgWidth) / 2, PAGE_HEIGHT - 12);
      
      // Page number
      const pageText = `Página ${page} de ${totalPages}`;
      const pageWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, (PAGE_WIDTH - pageWidth) / 2, PAGE_HEIGHT - 7);
      
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
