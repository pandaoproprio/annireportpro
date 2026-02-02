import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

// Wait for all images to load
const waitForImages = (container: HTMLElement): Promise<void> => {
  const images = container.querySelectorAll('img');
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  return Promise.all(promises).then(() => {});
};

// Create a hidden container with the report content for PDF capture
const createPdfContainer = (data: TeamReportExportData): HTMLDivElement => {
  const { project, report } = data;
  
  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0 
    ? report.photoCaptions 
    : report.photos?.map((url) => ({ url, caption: 'Registro fotográfico das atividades realizadas' })) || [];

  const container = document.createElement('div');
  container.id = 'pdf-export-container';
  container.style.cssText = `
    position: fixed !important;
    left: -99999px !important;
    top: -99999px !important;
    visibility: hidden !important;
    pointer-events: none !important;
    z-index: -99999 !important;
    width: 794px;
    background: white;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  `;

  // Helper to create sections
  const createSection = (content: string, pageBreakBefore = false): HTMLDivElement => {
    const section = document.createElement('div');
    section.className = 'pdf-section';
    section.style.cssText = `
      width: 100%;
      padding: 30px 38px 30px 57px;
      box-sizing: border-box;
      background: white;
      ${pageBreakBefore ? 'page-break-before: always;' : ''}
    `;
    section.innerHTML = content;
    return section;
  };

  // Main content section
  const mainContent = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 16pt; font-weight: bold; margin: 0; font-family: 'Times New Roman', Times, serif;">
        RELATÓRIO DA EQUIPE DE TRABALHO
      </h1>
    </div>
    
    <div style="margin-bottom: 30px;">
      <p style="margin: 8px 0; font-family: 'Times New Roman', Times, serif;">
        <strong>Termo de Fomento nº:</strong> ${project.fomentoNumber}
      </p>
      <p style="margin: 8px 0; font-family: 'Times New Roman', Times, serif;">
        <strong>Projeto:</strong> ${project.name}
      </p>
      <p style="margin: 8px 0; font-family: 'Times New Roman', Times, serif;">
        <strong>Período de Referência:</strong> ${formatPeriod(report.periodStart, report.periodEnd)}
      </p>
    </div>

    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 15px; font-family: 'Times New Roman', Times, serif;">
        1. Dados de Identificação
      </h2>
      <ul style="list-style-type: disc; padding-left: 25px; margin: 0; font-family: 'Times New Roman', Times, serif;">
        <li style="margin-bottom: 8px;">
          <strong>Prestador:</strong> ${report.providerName || '[Não informado]'}
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Responsável Técnico:</strong> ${report.responsibleName}
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Função:</strong> ${report.functionRole}
        </li>
      </ul>
    </div>

    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 15px; font-family: 'Times New Roman', Times, serif;">
        2. Relato de Execução da Coordenação do Projeto
      </h2>
      <div style="text-align: justify; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
        ${report.executionReport || '<p>[Nenhum relato informado]</p>'}
      </div>
    </div>

    <div style="margin-top: 60px; margin-bottom: 40px;">
      <p style="font-family: 'Times New Roman', Times, serif; margin-bottom: 60px;">
        Rio de Janeiro, ${getCurrentDate()}.
      </p>
      
      <div style="text-align: center; margin-top: 60px;">
        <div style="border-top: 1px solid #000; display: inline-block; padding-top: 10px; padding-left: 80px; padding-right: 80px; margin-bottom: 20px;">
          Assinatura do responsável legal
        </div>
        <p style="margin-top: 20px; font-family: 'Times New Roman', Times, serif;">
          <strong>Nome e cargo:</strong> ${report.responsibleName} - ${report.functionRole}
        </p>
        <p style="font-family: 'Times New Roman', Times, serif;">
          <strong>CNPJ:</strong> ${report.providerDocument || '[Não informado]'}
        </p>
      </div>
    </div>
  `;

  container.appendChild(createSection(mainContent));

  // Photos section (each photo on separate section for page break handling)
  if (photosToExport.length > 0) {
    const photosHeaderSection = createSection(`
      <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
        3. Anexos de Comprovação - Registros Fotográficos
      </h2>
    `, true);
    container.appendChild(photosHeaderSection);

    photosToExport.forEach((photo, idx) => {
      const photoSection = document.createElement('div');
      photoSection.className = 'pdf-photo-section';
      photoSection.style.cssText = `
        width: 100%;
        padding: 20px 38px 20px 57px;
        box-sizing: border-box;
        background: white;
        text-align: center;
      `;
      photoSection.innerHTML = `
        <div style="margin-bottom: 30px;">
          <img 
            src="${photo.url}" 
            alt="Foto ${idx + 1}" 
            style="max-width: 500px; max-height: 340px; object-fit: contain; border: 1px solid #ccc;"
            crossorigin="anonymous"
          />
          <p style="font-style: italic; font-size: 10pt; margin-top: 10px; font-family: 'Times New Roman', Times, serif; text-align: center;">
            Foto ${idx + 1}: ${photo.caption}
          </p>
        </div>
      `;
      container.appendChild(photoSection);
    });
  }

  return container;
};

export const exportTeamReportToPdf = async (data: TeamReportExportData): Promise<void> => {
  const { project, report } = data;

  // A4 dimensions in mm
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MARGIN_TOP_MM = 25;
  const MARGIN_BOTTOM_MM = 25;
  const MARGIN_LEFT_MM = 30;
  const MARGIN_RIGHT_MM = 20;
  const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM;
  const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;

  // Create hidden container
  const container = createPdfContainer(data);
  document.body.appendChild(container);

  try {
    // Wait for all images to load
    await waitForImages(container);
    
    // Give browser time to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture the entire container with high quality
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794, // A4 width at 96 DPI
      windowWidth: 794,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Calculate scaling
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pdfWidth = CONTENT_WIDTH_MM;
    const scaleFactor = pdfWidth / imgWidth;
    const pdfHeight = imgHeight * scaleFactor;

    // Add image to PDF with pagination
    let currentY = MARGIN_TOP_MM;
    let remainingHeight = pdfHeight;
    let pageNum = 1;
    const totalPages = Math.ceil(pdfHeight / CONTENT_HEIGHT_MM);
    
    // Helper to add footer
    const addFooter = (pageNumber: number) => {
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      
      // Organization name
      const orgName = project.organizationName;
      const orgWidth = pdf.getTextWidth(orgName);
      pdf.text(orgName, (A4_WIDTH_MM - orgWidth) / 2, A4_HEIGHT_MM - 12);
      
      // Page number
      const pageText = `Página ${pageNumber} de ${totalPages}`;
      const pageWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, (A4_WIDTH_MM - pageWidth) / 2, A4_HEIGHT_MM - 7);
      
      // Line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(MARGIN_LEFT_MM, A4_HEIGHT_MM - 18, A4_WIDTH_MM - MARGIN_RIGHT_MM, A4_HEIGHT_MM - 18);
    };

    // First page
    pdf.addImage(
      imgData, 
      'JPEG', 
      MARGIN_LEFT_MM, 
      MARGIN_TOP_MM, 
      pdfWidth, 
      pdfHeight,
      undefined,
      'FAST'
    );
    
    addFooter(1);

    // Additional pages if needed
    while (remainingHeight > CONTENT_HEIGHT_MM) {
      pdf.addPage();
      pageNum++;
      remainingHeight -= CONTENT_HEIGHT_MM;
      
      // Offset the image to show the next portion
      const yOffset = MARGIN_TOP_MM - (pageNum - 1) * CONTENT_HEIGHT_MM;
      
      pdf.addImage(
        imgData,
        'JPEG',
        MARGIN_LEFT_MM,
        yOffset,
        pdfWidth,
        pdfHeight,
        undefined,
        'FAST'
      );
      
      // Cover previous page content at top with white rectangle
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, A4_WIDTH_MM, MARGIN_TOP_MM, 'F');
      
      // Cover next page content at bottom
      pdf.rect(0, A4_HEIGHT_MM - MARGIN_BOTTOM_MM, A4_WIDTH_MM, MARGIN_BOTTOM_MM, 'F');
      
      addFooter(pageNum);
    }

    // Save PDF
    const memberName = report.responsibleName.replace(/\s+/g, '_');
    const filename = `Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    pdf.save(filename);
    
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
};
