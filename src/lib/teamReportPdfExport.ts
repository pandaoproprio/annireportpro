import html2pdf from 'html2pdf.js';
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

  // Build HTML content for PDF - removed padding since html2pdf already applies margins
  const htmlContent = `
    <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; word-wrap: break-word; overflow-wrap: break-word;">
      <!-- Title -->
      <h1 style="text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 24px; word-wrap: break-word;">
        RELATÓRIO DA EQUIPE DE TRABALHO
      </h1>

      <!-- Header Info -->
      <p style="margin-bottom: 6px; word-wrap: break-word;">
        <strong>Termo de Fomento nº:</strong> ${project.fomentoNumber}
      </p>
      <p style="margin-bottom: 6px; word-wrap: break-word;">
        <strong>Projeto:</strong> ${project.name}
      </p>
      <p style="margin-bottom: 24px; word-wrap: break-word;">
        <strong>Período de Referência:</strong> ${formatPeriod(report.periodStart, report.periodEnd)}
      </p>

      <!-- Section 1: Identification -->
      <h2 style="font-size: 14pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px;">
        1. Dados de Identificação
      </h2>
      <ul style="margin-left: 20px; list-style-type: disc;">
        <li style="margin-bottom: 6px; word-wrap: break-word;"><strong>Prestador:</strong> ${report.providerName || '[Não informado]'}</li>
        <li style="margin-bottom: 6px; word-wrap: break-word;"><strong>Responsável Técnico:</strong> ${report.responsibleName}</li>
        <li style="margin-bottom: 6px; word-wrap: break-word;"><strong>Função:</strong> ${report.functionRole}</li>
      </ul>

      <!-- Section 2: Execution Report -->
      <h2 style="font-size: 14pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px;">
        2. Relato de Execução da Coordenação do Projeto
      </h2>
      <div style="text-align: justify; word-wrap: break-word; overflow-wrap: break-word;">
        ${report.executionReport || '<p>[Nenhum relato informado]</p>'}
      </div>

      ${photosToExport.length > 0 ? `
        <!-- Section 3: Photos -->
        <div style="page-break-before: always;"></div>
        <h2 style="font-size: 14pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px;">
          3. Anexos de Comprovação - Registros Fotográficos
        </h2>
        <div style="text-align: center;">
          ${photosToExport.map((photo, idx) => `
            <div style="margin-bottom: 30px; ${idx > 0 && idx % 2 === 0 ? 'page-break-before: always;' : ''}">
              <img 
                src="${photo.url}" 
                style="max-width: 100%; max-height: 300px; border: 1px solid #ccc; display: block; margin: 0 auto;" 
                alt="Foto ${idx + 1}"
              />
              <p style="font-style: italic; font-size: 10pt; margin-top: 8px; text-align: center; word-wrap: break-word;">
                Foto ${idx + 1}: ${photo.caption}
              </p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Signature Section -->
      <div style="margin-top: 60px;">
        <p style="text-align: left; margin-bottom: 60px;">
          Rio de Janeiro, ${getCurrentDate()}.
        </p>
        <div style="text-align: center;">
          <p style="margin-bottom: 8px;">_____________________________________</p>
          <p style="margin-bottom: 16px;">Assinatura do responsável legal</p>
          <p style="margin-bottom: 6px; word-wrap: break-word;">
            <strong>Nome e cargo:</strong> ${report.responsibleName} - ${report.functionRole}
          </p>
          <p style="word-wrap: break-word;">
            <strong>CNPJ:</strong> ${report.providerDocument || '[Não informado]'}
          </p>
        </div>
      </div>
    </div>
  `;

  // Create container element - no padding here, margins are applied by html2pdf
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.width = '160mm'; // A4 width (210mm) minus margins (30mm + 20mm)
  container.style.boxSizing = 'border-box';
  document.body.appendChild(container);

  const memberName = report.responsibleName.replace(/\s+/g, '_');
  const filename = `Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    const pdfInstance = html2pdf()
      .set({
        margin: [30, 20, 20, 30],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
        },
      })
      .from(container);

    // Generate PDF with page numbers
    const pdf = await pdfInstance.toPdf().get('pdf');
    
    const totalPages = pdf.internal.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      
      // Add organization name
      const orgText = project.organizationName;
      const orgTextWidth = pdf.getTextWidth(orgText);
      pdf.text(orgText, (pageWidth - orgTextWidth) / 2, pageHeight - 15);
      
      // Add page number
      const pageText = `Página ${i} de ${totalPages}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, (pageWidth - pageTextWidth) / 2, pageHeight - 10);
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
};
