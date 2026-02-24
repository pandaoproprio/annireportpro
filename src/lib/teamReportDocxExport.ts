import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  Footer,
  PageNumber,
  convertInchesToTwip,
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { Project, TeamReport } from '@/types';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';

// Helper function to fetch image as ArrayBuffer
const fetchImageAsArrayBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};

// Helper function to get image dimensions
const getImageDimensions = (arrayBuffer: ArrayBuffer): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 400, height: 300 }); // Default dimensions
    };
    img.src = url;
  });
};

interface TeamReportExportData {
  project: Project;
  report: TeamReport;
  visualConfig?: ReportVisualConfig;
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

// Parse HTML content to docx paragraphs
const parseHtmlToDocxParagraphs = (html: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const processNode = (node: Node, isBold = false, isItalic = false, isUnderline = false): TextRun[] => {
    const runs: TextRun[] = [];
    
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.trim()) {
          runs.push(new TextRun({
            text,
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? {} : undefined,
            font: ABNT.FONT_FAMILY,
            size: ABNT.FONT_SIZE_BODY,
          }));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        
        let newBold = isBold;
        let newItalic = isItalic;
        let newUnderline = isUnderline;
        
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
          children: [
            new TextRun({ text: '• ', font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
            ...runs,
          ],
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
          children: [
            new TextRun({ text: `${counter}. `, font: ABNT.FONT_FAMILY, size: ABNT.FONT_SIZE_BODY }),
            ...runs,
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100, line: ABNT.LINE_SPACING },
          indent: { left: 720 },
        }));
        counter++;
      });
    }
  };
  
  // Process body children
  doc.body.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      processElement(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      // Handle plain text
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: child.textContent.trim(),
            font: ABNT.FONT_FAMILY,
            size: ABNT.FONT_SIZE_BODY,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: ABNT.LINE_SPACING },
        indent: { firstLine: ABNT.FIRST_LINE_INDENT },
      }));
    }
  });
  
  return paragraphs;
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

  // Parse HTML content from rich text editor
  const reportParagraphs = parseHtmlToDocxParagraphs(report.executionReport);
  docSections.push(...reportParagraphs);

  // Section 3: Attachments (Photos) - with embedded images and custom captions
  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0 
    ? report.photoCaptions 
    : report.photos?.map((url, idx) => ({ url, caption: 'Registro fotográfico das atividades realizadas' })) || [];

  if (photosToExport.length > 0) {
    docSections.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [
          new TextRun({
            text: '3. Anexos de Comprovação - Registros Fotográficos',
            bold: true,
            font: ABNT.FONT_FAMILY,
            size: ABNT.FONT_SIZE_HEADING,
          }),
        ],
        spacing: { before: 400, after: 300, line: ABNT.LINE_SPACING },
      })
    );

    // Add each photo with custom caption
    const maxWidth = 450; // Max width in pixels for the document
    let photoCount = 0;

    for (const photoData of photosToExport) {
      photoCount++;
      const imageBuffer = await fetchImageAsArrayBuffer(photoData.url);
      
      if (imageBuffer) {
        const dimensions = await getImageDimensions(imageBuffer);
        
        // Calculate scaled dimensions to fit document width
        let width = dimensions.width;
        let height = dimensions.height;
        
        if (width > maxWidth) {
          const scale = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * scale);
        }

        // Add the image
        docSections.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width,
                  height,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 100 },
          }),
          // Caption below the image - using custom caption
          new Paragraph({
            children: [
              new TextRun({
                text: `Foto ${photoCount}: ${photoData.caption}`,
                italics: true,
                font: ABNT.FONT_FAMILY,
                size: 20, // 10pt for caption
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, line: ABNT.LINE_SPACING },
          })
        );

        // Add page break after every 2 photos to avoid overcrowding
        if (photoCount % 2 === 0 && photoCount < photosToExport.length) {
          docSections.push(new Paragraph({ children: [new PageBreak()] }));
        }
      } else {
        // If image couldn't be loaded, add a placeholder text
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Foto ${photoCount}: Imagem não disponível]`,
                italics: true,
                font: ABNT.FONT_FAMILY,
                size: ABNT.FONT_SIZE_BODY,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200, line: ABNT.LINE_SPACING },
          })
        );
      }
    }
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
            children: (() => {
              const vc = data.visualConfig;
              const children: Paragraph[] = [];
              const instEnabled = vc ? vc.footerInstitutionalEnabled !== false : true;

              if (instEnabled) {
                const l1Text = vc?.footerLine1Text || project.organizationName;
                const l1Size = Math.round((vc?.footerLine1FontSize ?? 9) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [new TextRun({ text: l1Text, size: l1Size, font: ABNT.FONT_FAMILY, bold: true })],
                }));
                if (vc?.footerLine2Text) {
                  const l2Size = Math.round((vc.footerLine2FontSize ?? 7) * 2);
                  children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 20 },
                    children: [new TextRun({ text: vc.footerLine2Text, size: l2Size, font: ABNT.FONT_FAMILY })],
                  }));
                }
                if (vc?.footerLine3Text) {
                  const l3Size = Math.round((vc.footerLine3FontSize ?? 7) * 2);
                  children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 20 },
                    children: [new TextRun({ text: vc.footerLine3Text, size: l3Size, font: ABNT.FONT_FAMILY })],
                  }));
                }
              } else {
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: project.organizationName, font: ABNT.FONT_FAMILY, size: 20 })],
                }));
              }

              if (vc?.footerText) {
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [new TextRun({ text: vc.footerText, size: 14, font: ABNT.FONT_FAMILY, italics: true })],
                }));
              }

              return children;
            })(),
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
