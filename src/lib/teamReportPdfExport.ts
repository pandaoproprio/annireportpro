import html2canvas from 'html2canvas';
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

export const exportTeamReportToPdf = async (data: TeamReportExportData): Promise<void> => {
  const { project, report } = data;

  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0 
    ? report.photoCaptions 
    : report.photos?.map((url) => ({ url, caption: 'Registro fotográfico das atividades realizadas' })) || [];

  // Create container element with proper styling for A4
  const container = document.createElement('div');
  container.id = 'pdf-export-container';
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 794px;
    background: white;
    padding: 60px 40px 40px 60px;
    box-sizing: border-box;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  `;

  // Build HTML content for PDF
  container.innerHTML = `
    <div style="width: 100%;">
      <!-- Title -->
      <h1 style="text-align: center; font-size: 16pt; font-weight: bold; margin: 0 0 24px 0; font-family: 'Times New Roman', Times, serif;">
        RELATÓRIO DA EQUIPE DE TRABALHO
      </h1>

      <!-- Header Info -->
      <p style="margin: 0 0 6px 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
        <strong>Termo de Fomento nº:</strong> ${project.fomentoNumber}
      </p>
      <p style="margin: 0 0 6px 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
        <strong>Projeto:</strong> ${project.name}
      </p>
      <p style="margin: 0 0 24px 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
        <strong>Período de Referência:</strong> ${formatPeriod(report.periodStart, report.periodEnd)}
      </p>

      <!-- Section 1: Identification -->
      <h2 style="font-size: 14pt; font-weight: bold; margin: 24px 0 12px 0; font-family: 'Times New Roman', Times, serif;">
        1. Dados de Identificação
      </h2>
      <ul style="margin: 0 0 0 20px; padding: 0; list-style-type: disc; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
        <li style="margin-bottom: 6px;"><strong>Prestador:</strong> ${report.providerName || '[Não informado]'}</li>
        <li style="margin-bottom: 6px;"><strong>Responsável Técnico:</strong> ${report.responsibleName}</li>
        <li style="margin-bottom: 6px;"><strong>Função:</strong> ${report.functionRole}</li>
      </ul>

      <!-- Section 2: Execution Report -->
      <h2 style="font-size: 14pt; font-weight: bold; margin: 24px 0 12px 0; font-family: 'Times New Roman', Times, serif;">
        2. Relato de Execução da Coordenação do Projeto
      </h2>
      <div style="text-align: justify; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
        ${report.executionReport || '<p>[Nenhum relato informado]</p>'}
      </div>

      <!-- Signature Section -->
      <div style="margin-top: 60px;">
        <p style="text-align: left; margin: 0 0 60px 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
          Rio de Janeiro, ${getCurrentDate()}.
        </p>
        <div style="text-align: center;">
          <p style="margin: 0 0 8px 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">_____________________________________</p>
          <p style="margin: 0 0 16px 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">Assinatura do responsável legal</p>
          <p style="margin: 0 0 6px 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
            <strong>Nome e cargo:</strong> ${report.responsibleName} - ${report.functionRole}
          </p>
          <p style="margin: 0; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
            <strong>CNPJ:</strong> ${report.providerDocument || '[Não informado]'}
          </p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const memberName = report.responsibleName.replace(/\s+/g, '_');
  const filename = `Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Render first page (text content)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = a4Width;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first segment
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= a4Height;

    // Handle multi-page text content
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= a4Height;
    }

    // Add photos section if there are photos
    if (photosToExport.length > 0) {
      // Create photo pages - 2 photos per page in a grid
      for (let i = 0; i < photosToExport.length; i += 2) {
        pdf.addPage();

        const pagePhotos = photosToExport.slice(i, i + 2);
        
        // Add section title on first photo page
        if (i === 0) {
          pdf.setFont('times', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          pdf.text('3. Anexos de Comprovação - Registros Fotográficos', 30, 30);
        }

        const startY = i === 0 ? 45 : 20;
        const photoHeight = 100;
        const photoWidth = 75;
        const captionHeight = 15;
        const spacing = 10;

        for (let j = 0; j < pagePhotos.length; j++) {
          const photo = pagePhotos[j];
          const photoIndex = i + j + 1;
          const yPosition = startY + j * (photoHeight + captionHeight + spacing);

          try {
            // Load image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('Failed to load image'));
              img.src = photo.url;
            });

            // Calculate centered position for photo
            const xPosition = (a4Width - photoWidth) / 2;

            // Add image to PDF
            pdf.addImage(img, 'JPEG', xPosition, yPosition, photoWidth, photoHeight);

            // Add caption below photo
            pdf.setFont('times', 'italic');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            
            const caption = `Foto ${photoIndex}: ${photo.caption}`;
            const captionLines = pdf.splitTextToSize(caption, a4Width - 60);
            const captionY = yPosition + photoHeight + 5;
            
            captionLines.forEach((line: string, lineIndex: number) => {
              const textWidth = pdf.getTextWidth(line);
              const textX = (a4Width - textWidth) / 2;
              pdf.text(line, textX, captionY + (lineIndex * 5));
            });

          } catch (error) {
            console.error(`Failed to load photo ${photoIndex}:`, error);
            // Add placeholder for failed image
            pdf.setFont('times', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`[Foto ${photoIndex} não disponível]`, a4Width / 2, yPosition + 50, { align: 'center' });
          }
        }
      }
    }

    // Add page numbers and footer to all pages
    const totalPages = (pdf as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);

      // Add organization name
      const orgText = project.organizationName;
      const orgTextWidth = pdf.getTextWidth(orgText);
      pdf.text(orgText, (a4Width - orgTextWidth) / 2, a4Height - 15);

      // Add page number
      const pageText = `Página ${i} de ${totalPages}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, (a4Width - pageTextWidth) / 2, a4Height - 10);
    }

    pdf.save(filename);

  } finally {
    document.body.removeChild(container);
  }
};
