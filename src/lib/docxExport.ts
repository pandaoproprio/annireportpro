import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Footer,
  PageNumber,
  ImageRun,
  ShadingType,
  TableOfContents,
} from 'docx';
import { saveAs } from 'file-saver';
import { Project, Activity, ActivityType, ExpenseItem, ReportSection, PhotoGroup, ReportPhotoMeta } from '@/types';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';

interface ExportData {
  project: Project;
  activities: Activity[];
  sections: ReportSection[];
  objectText: string;
  summary: string;
  goalNarratives: Record<string, string>;
  otherActionsNarrative: string;
  communicationNarrative: string;
  satisfaction: string;
  futureActions: string;
  expenses: ExpenseItem[];
  links: { attendance: string; registration: string; media: string };
  linkDisplayNames?: { attendance: string; registration: string; media: string };
  visualConfig?: ReportVisualConfig;
  selectedVideoUrls?: string[];
  goalPhotos?: Record<string, string[]>;
  otherActionsPhotos?: string[];
  communicationPhotos?: string[];
  sectionPhotos?: Record<string, string[]>;
  photoMetadata?: Record<string, ReportPhotoMeta[]>;
  sectionPhotoGroups?: Record<string, PhotoGroup[]>;
}

// ── Constants ──
// A4 in DXA: 11906 x 16838
const PAGE_WIDTH = 11906;
const MARGIN_LEFT = 1701; // 3cm
const MARGIN_RIGHT = 1134; // 2cm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 9071 DXA

const isDeletedActivity = (a: Activity) =>
  Boolean((a as any).deleted_at || (a as any).deletedAt || (a as any).deleted);

const formatActivityDate = (date: string, endDate?: string) => {
  const start = new Date(date).toLocaleDateString('pt-BR');
  if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
  return start;
};

// Strip HTML tags and return plain text
const stripHtml = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Parse HTML into TextRun segments preserving bold/italic/underline
const parseHtmlToRuns = (html: string): TextRun[] => {
  if (!html || !html.trim()) return [new TextRun({ text: '', font: 'Times New Roman', size: 24 })];

  if (!/[<][a-z!/]/i.test(html)) {
    return [new TextRun({ text: html.trim(), font: 'Times New Roman', size: 24 })];
  }

  const runs: TextRun[] = [];
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n');

  const regex = /<(strong|b|em|i|u)>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = stripHtml(text.substring(lastIndex, match.index));
      if (before) runs.push(new TextRun({ text: before, font: 'Times New Roman', size: 24 }));
    }
    const tag = match[1].toLowerCase();
    const content = stripHtml(match[2]);
    if (content) {
      runs.push(new TextRun({
        text: content,
        font: 'Times New Roman',
        size: 24,
        bold: tag === 'strong' || tag === 'b',
        italics: tag === 'em' || tag === 'i',
        underline: tag === 'u' ? {} : undefined,
      }));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = stripHtml(text.substring(lastIndex));
    if (remaining) runs.push(new TextRun({ text: remaining, font: 'Times New Roman', size: 24 }));
  }

  if (runs.length === 0) {
    const plain = stripHtml(html);
    runs.push(new TextRun({ text: plain || '', font: 'Times New Roman', size: 24 }));
  }

  return runs;
};

// Helper: convert text/HTML into multiple ABNT-formatted paragraphs
const richTextToParagraphs = (
  text: string,
  options?: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean }
): Paragraph[] => {
  if (!text || !text.trim()) return [new Paragraph({ text: '', spacing: { after: 200 } })];

  if (/[<][a-z!/]/i.test(text)) {
    const plainText = stripHtml(text);
    const lines = plainText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [new Paragraph({ text: '', spacing: { after: 200 } })];
    return lines.map(
      line =>
        new Paragraph({
          alignment: options?.alignment ?? AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 },
          indent: { firstLine: 709 },
          children: [
            new TextRun({
              text: line,
              font: 'Times New Roman',
              size: 24,
              bold: options?.bold,
            }),
          ],
        })
    );
  }

  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [new Paragraph({ text: '', spacing: { after: 200 } })];
  return lines.map(
    line =>
      new Paragraph({
        alignment: options?.alignment ?? AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: 360 },
        indent: { firstLine: 709 },
        children: [
          new TextRun({
            text: line,
            font: 'Times New Roman',
            size: 24,
            bold: options?.bold,
          }),
        ],
      })
  );
};

const textToParagraphs = richTextToParagraphs;

// ── Image fetching ──
async function fetchImageAsBuffer(url: string): Promise<{ buffer: ArrayBuffer; type: 'png' | 'jpg' } | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    const buffer = await response.arrayBuffer();
    const type = contentType.includes('png') ? 'png' : 'jpg';
    return { buffer, type };
  } catch (e) {
    console.warn('Failed to fetch image for DOCX:', url, e);
    return null;
  }
}

// Create an ImageRun paragraph from a fetched image
function createImageParagraph(
  imageData: { buffer: ArrayBuffer; type: 'png' | 'jpg' },
  widthEmu: number,
  heightEmu: number,
  altText: string = 'Foto'
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new ImageRun({
        type: imageData.type,
        data: imageData.buffer,
        transformation: {
          width: Math.round(widthEmu / 9525), // EMU to pixels (approx)
          height: Math.round(heightEmu / 9525),
        },
        altText: { title: altText, description: altText, name: altText },
      }),
    ],
  });
}

// Fetch all images and return paragraphs with photos in a grid-like layout
async function buildPhotoSection(
  photos: string[],
  metadata: ReportPhotoMeta[] | undefined,
  sectionKey: string,
  groups?: PhotoGroup[]
): Promise<(Paragraph | Table)[]> {
  if (!photos || photos.length === 0) return [];

  const elements: (Paragraph | Table)[] = [];

  // If there are groups, render them first
  const groupedIndices = new Set<number>();
  if (groups && groups.length > 0) {
    for (const group of groups) {
      const groupPhotos: { url: string; index: number }[] = [];
      for (const idStr of group.photoIds) {
        const idx = Number(idStr);
        if (photos[idx]) {
          groupPhotos.push({ url: photos[idx], index: idx });
          groupedIndices.add(idx);
        }
      }

      if (groupPhotos.length === 0) continue;

      // Group caption
      if (group.caption) {
        elements.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: group.caption, font: 'Times New Roman', size: 20, bold: true })],
        }));
      }

      // Render group photos in a 2-column table
      const rows: TableRow[] = [];
      for (let i = 0; i < groupPhotos.length; i += 2) {
        const cells: TableCell[] = [];
        for (let j = 0; j < 2; j++) {
          const gp = groupPhotos[i + j];
          if (gp) {
            const imgData = await fetchImageAsBuffer(gp.url);
            const cellChildren: Paragraph[] = [];
            if (imgData) {
              cellChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({
                  type: imgData.type,
                  data: imgData.buffer,
                  transformation: { width: 220, height: 165 },
                  altText: { title: 'Foto', description: 'Foto', name: 'Foto' },
                })],
              }));
            }
            const meta = metadata?.[gp.index];
            if (meta?.caption) {
              cellChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [new TextRun({ text: meta.caption, font: 'Times New Roman', size: 18, italics: true })],
              }));
            }
            if (cellChildren.length === 0) cellChildren.push(new Paragraph(''));
            cells.push(new TableCell({
              width: { size: Math.floor(CONTENT_WIDTH / 2), type: WidthType.DXA },
              borders: noBorders(),
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: cellChildren,
            }));
          } else {
            cells.push(new TableCell({
              width: { size: Math.floor(CONTENT_WIDTH / 2), type: WidthType.DXA },
              borders: noBorders(),
              children: [new Paragraph('')],
            }));
          }
        }
        rows.push(new TableRow({ children: cells }));
      }

      if (rows.length > 0) {
        elements.push(new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [Math.floor(CONTENT_WIDTH / 2), Math.floor(CONTENT_WIDTH / 2)],
          rows,
        }));
      }
    }
  }

  // Render ungrouped photos in a 3-column table
  const ungrouped = photos
    .map((url, idx) => ({ url, idx }))
    .filter(p => !groupedIndices.has(p.idx));

  if (ungrouped.length > 0) {
    const colWidth = Math.floor(CONTENT_WIDTH / 3);
    const rows: TableRow[] = [];

    for (let i = 0; i < ungrouped.length; i += 3) {
      const cells: TableCell[] = [];
      for (let j = 0; j < 3; j++) {
        const item = ungrouped[i + j];
        if (item) {
          const imgData = await fetchImageAsBuffer(item.url);
          const cellChildren: Paragraph[] = [];
          if (imgData) {
            cellChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({
                type: imgData.type,
                data: imgData.buffer,
                transformation: { width: 180, height: 135 },
                altText: { title: 'Foto', description: 'Foto', name: 'Foto' },
              })],
            }));
          }
          const meta = metadata?.[item.idx];
          if (meta?.caption) {
            cellChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40 },
              children: [new TextRun({ text: meta.caption, font: 'Times New Roman', size: 18, italics: true })],
            }));
          }
          if (cellChildren.length === 0) cellChildren.push(new Paragraph(''));
          cells.push(new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            borders: noBorders(),
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: cellChildren,
          }));
        } else {
          cells.push(new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            borders: noBorders(),
            children: [new Paragraph('')],
          }));
        }
      }
      rows.push(new TableRow({ children: cells }));
    }

    if (rows.length > 0) {
      elements.push(new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [colWidth, colWidth, colWidth],
        rows,
      }));
    }
  }

  return elements;
}

// No-border helper
function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none };
}

// Table cell border helper
function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  return { top: b, bottom: b, left: b, right: b };
}

export const exportToDocx = async (data: ExportData) => {
  const {
    project,
    activities,
    sections,
    objectText,
    summary,
    goalNarratives,
    otherActionsNarrative,
    communicationNarrative,
    satisfaction,
    futureActions,
    expenses,
    links,
    selectedVideoUrls = [],
    goalPhotos = {},
    otherActionsPhotos = [],
    communicationPhotos = [],
    sectionPhotos = {},
    photoMetadata = {},
    sectionPhotoGroups = {},
  } = data;

  const getActivitiesByGoal = (goalId: string) =>
    activities.filter(a => a.goalId === goalId && !isDeletedActivity(a)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCommunicationActivities = () =>
    activities.filter(a => a.type === ActivityType.COMUNICACAO && !isDeletedActivity(a)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOtherActivities = () =>
    activities.filter(a => (a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO || a.type === ActivityType.OCORRENCIA) && !isDeletedActivity(a))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build document sections
  const docSections: (Paragraph | Table)[] = [];

  // Cover Page
  docSections.push(
    new Paragraph({ text: '', spacing: { after: 2000 } }),
    new Paragraph({
      text: 'Relatório Parcial de Cumprimento do Objeto',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: project.name,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: `Termo de Fomento nº ${project.fomentoNumber}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: project.organizationName, bold: true, size: 28, font: 'Times New Roman' })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    // Table of Contents
    new Paragraph({
      text: 'SUMÁRIO',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new TableOfContents("Sumário", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Process each visible section
  for (const section of sections) {
    if (!section.isVisible) continue;

    const sectionKey = section.type === 'custom' ? section.id : section.key;

    // Section title
    docSections.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    switch (section.key) {
      case 'object':
        docSections.push(...textToParagraphs(objectText || '[Descrição do objeto]'));
        break;

      case 'summary':
        docSections.push(...textToParagraphs(summary || '[Resumo das atividades]'));
        break;

      case 'goals':
        for (let idx = 0; idx < project.goals.length; idx++) {
          const goal = project.goals[idx];
          const goalActs = getActivitiesByGoal(goal.id);

          docSections.push(
            new Paragraph({
              text: goal.title,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 200 },
            })
          );

          docSections.push(...textToParagraphs(goalNarratives[goal.id] || '[Descreva as realizações da meta]'));

          if (goalActs.length > 0) {
            docSections.push(
              new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: 'Atividades realizadas:', bold: true, font: 'Times New Roman', size: 24 })],
              })
            );

            for (const act of goalActs) {
              docSections.push(
                new Paragraph({
                  spacing: { after: 50 },
                  indent: { left: 400 },
                  children: [new TextRun({
                    text: `• ${formatActivityDate(act.date, act.endDate)}${act.location ? ` – ${act.location}` : ''}${act.attendeesCount > 0 ? ` – ${act.attendeesCount} participantes` : ''}`,
                    font: 'Times New Roman', size: 24,
                  })],
                }),
                new Paragraph({
                  spacing: { after: 100 },
                  indent: { left: 400 },
                  children: [new TextRun({ text: act.description, font: 'Times New Roman', size: 24 })],
                })
              );
            }
          }

          // Goal photos
          const gPhotos = goalPhotos[goal.id];
          if (gPhotos && gPhotos.length > 0) {
            const photoElements = await buildPhotoSection(gPhotos, photoMetadata[goal.id], goal.id);
            docSections.push(...photoElements);
          }
        }

        // Section-level photos for goals
        {
          const goalSectionPhotos = sectionPhotos['goals'];
          if (goalSectionPhotos && goalSectionPhotos.length > 0) {
            const photoElements = await buildPhotoSection(goalSectionPhotos, photoMetadata['goals'], 'goals', sectionPhotoGroups['goals']);
            docSections.push(...photoElements);
          }
        }
        break;

      case 'other': {
        const otherActs = getOtherActivities();
        docSections.push(...textToParagraphs(otherActionsNarrative || '[Outras informações sobre as ações desenvolvidas]'));

        if (otherActs.length > 0) {
          docSections.push(
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: 'Atividades relacionadas:', bold: true, font: 'Times New Roman', size: 24 })],
            })
          );

          for (const act of otherActs) {
            docSections.push(
              new Paragraph({
                spacing: { after: 50 },
                indent: { left: 400 },
                children: [new TextRun({
                  text: `• ${formatActivityDate(act.date)}: ${act.description}`,
                  font: 'Times New Roman', size: 24,
                })],
              })
            );
          }
        }

        // Section photos
        const otherSPhotos = sectionPhotos['other'] || otherActionsPhotos;
        if (otherSPhotos && otherSPhotos.length > 0) {
          const photoElements = await buildPhotoSection(otherSPhotos, photoMetadata['other'], 'other', sectionPhotoGroups['other']);
          docSections.push(...photoElements);
        }
        break;
      }

      case 'communication': {
        const commActs = getCommunicationActivities();
        docSections.push(...textToParagraphs(communicationNarrative || '[Publicações e ações de divulgação]'));

        if (commActs.length > 0) {
          docSections.push(
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: 'Atividades de divulgação:', bold: true, font: 'Times New Roman', size: 24 })],
            })
          );

          for (const act of commActs) {
            docSections.push(
              new Paragraph({
                spacing: { after: 50 },
                indent: { left: 400 },
                children: [new TextRun({
                  text: `• ${formatActivityDate(act.date)}: ${act.description}`,
                  font: 'Times New Roman', size: 24,
                })],
              })
            );
          }
        }

        // Section photos
        const commSPhotos = sectionPhotos['communication'] || communicationPhotos;
        if (commSPhotos && commSPhotos.length > 0) {
          const photoElements = await buildPhotoSection(commSPhotos, photoMetadata['communication'], 'communication', sectionPhotoGroups['communication']);
          docSections.push(...photoElements);
        }
        break;
      }

      case 'satisfaction':
        docSections.push(...textToParagraphs(satisfaction || '[Grau de satisfação do público-alvo]'));
        {
          const satPhotos = sectionPhotos['satisfaction'];
          if (satPhotos && satPhotos.length > 0) {
            const photoElements = await buildPhotoSection(satPhotos, photoMetadata['satisfaction'], 'satisfaction', sectionPhotoGroups['satisfaction']);
            docSections.push(...photoElements);
          }
        }
        break;

      case 'future':
        docSections.push(...textToParagraphs(futureActions || '[Sobre as ações futuras]'));
        {
          const futPhotos = sectionPhotos['future'];
          if (futPhotos && futPhotos.length > 0) {
            const photoElements = await buildPhotoSection(futPhotos, photoMetadata['future'], 'future', sectionPhotoGroups['future']);
            docSections.push(...photoElements);
          }
        }
        break;

      case 'expenses':
        if (expenses.length > 0) {
          // Column widths in DXA — must sum to CONTENT_WIDTH
          const col1W = Math.floor(CONTENT_WIDTH * 0.24);
          const col2W = Math.floor(CONTENT_WIDTH * 0.46);
          const col3W = CONTENT_WIDTH - col1W - col2W;

          const headerBorders = cellBorders();
          const headerShading = { fill: 'D5E8F0', type: ShadingType.CLEAR, color: 'auto' as const };
          const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

          const dataRows: TableRow[] = [];
          for (const expense of expenses) {
            const hasPhotoUrl = expense.image && expense.image.startsWith('http');
            const cellChildren: Paragraph[] = [];

            if (hasPhotoUrl) {
              const imgData = await fetchImageAsBuffer(expense.image!);
              if (imgData) {
                cellChildren.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new ImageRun({
                    type: imgData.type,
                    data: imgData.buffer,
                    transformation: { width: 150, height: 112 },
                    altText: { title: 'Comprovante', description: 'Comprovante de despesa', name: 'Comprovante' },
                  })],
                }));
              } else {
                cellChildren.push(new Paragraph({ text: '[Imagem indisponível]', alignment: AlignmentType.CENTER }));
              }
            } else {
              cellChildren.push(new Paragraph({ text: 'Sem foto', alignment: AlignmentType.CENTER }));
            }

            dataRows.push(new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: expense.itemName || '-', font: 'Times New Roman', size: 22 })] })],
                  width: { size: col1W, type: WidthType.DXA },
                  borders: cellBorders(),
                  margins: cellMargins,
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: expense.description || '-', font: 'Times New Roman', size: 22 })] })],
                  width: { size: col2W, type: WidthType.DXA },
                  borders: cellBorders(),
                  margins: cellMargins,
                }),
                new TableCell({
                  children: cellChildren.length > 0 ? cellChildren : [new Paragraph('')],
                  width: { size: col3W, type: WidthType.DXA },
                  borders: cellBorders(),
                  margins: cellMargins,
                }),
              ],
            }));
          }

          const expenseTable = new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: [col1W, col2W, col3W],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Item de Despesa', font: 'Times New Roman', size: 22, bold: true })] })],
                    shading: headerShading,
                    width: { size: col1W, type: WidthType.DXA },
                    borders: headerBorders,
                    margins: cellMargins,
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Descrição de Uso', font: 'Times New Roman', size: 22, bold: true })] })],
                    shading: headerShading,
                    width: { size: col2W, type: WidthType.DXA },
                    borders: headerBorders,
                    margins: cellMargins,
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Registro Fotográfico', font: 'Times New Roman', size: 22, bold: true })] })],
                    shading: headerShading,
                    width: { size: col3W, type: WidthType.DXA },
                    borders: headerBorders,
                    margins: cellMargins,
                  }),
                ],
              }),
              ...dataRows,
            ],
          });
          docSections.push(expenseTable);
        } else {
          docSections.push(
            new Paragraph({
              text: '[Nenhum item de despesa cadastrado]',
              spacing: { after: 200 },
            })
          );
        }
        break;

      case 'links': {
        const dn = data.linkDisplayNames || { attendance: '', registration: '', media: '' };
        docSections.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Lista de Presença: ', bold: true, font: 'Times New Roman', size: 24 }),
              new TextRun({ text: dn.attendance || links.attendance || '[não informado]', font: 'Times New Roman', size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'Lista de Inscrição: ', bold: true, font: 'Times New Roman', size: 24 }),
              new TextRun({ text: dn.registration || links.registration || '[não informado]', font: 'Times New Roman', size: 24 }),
            ],
          }),
        );

        const videoUrls = selectedVideoUrls || [];
        const mediaText = dn.media || links.media || '';
        const allMediaUrls = [
          ...mediaText.split('\n').filter(l => l.trim()),
          ...videoUrls.filter(u => u.trim()),
        ];
        const uniqueMediaUrls = Array.from(new Set(allMediaUrls));
        if (uniqueMediaUrls.length > 0) {
          if (dn.media || uniqueMediaUrls.length <= 1) {
            docSections.push(
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({ text: 'Mídias (Fotos/Vídeos): ', bold: true, font: 'Times New Roman', size: 24 }),
                  new TextRun({ text: dn.media || uniqueMediaUrls[0] || '', font: 'Times New Roman', size: 24 }),
                ],
              })
            );
          } else {
            docSections.push(
              new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ text: 'Mídias (Fotos/Vídeos):', bold: true, font: 'Times New Roman', size: 24 })],
              })
            );
            for (const mUrl of uniqueMediaUrls) {
              docSections.push(
                new Paragraph({
                  spacing: { after: 60 },
                  indent: { left: 400 },
                  children: [new TextRun({ text: mUrl, font: 'Times New Roman', size: 22, color: '0563C1' })],
                })
              );
            }
          }
        }
        break;
      }

      default:
        if (section.type === 'custom' && section.content) {
          docSections.push(...richTextToParagraphs(section.content));
        }
        // Custom section photos
        {
          const customPhotos = sectionPhotos[sectionKey];
          if (customPhotos && customPhotos.length > 0) {
            const photoElements = await buildPhotoSection(customPhotos, photoMetadata[sectionKey], sectionKey, sectionPhotoGroups[sectionKey]);
            docSections.push(...photoElements);
          }
        }
    }
  }

  // Signature section
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  docSections.push(
    new Paragraph({ text: '', spacing: { after: 800 } }),
    new Paragraph({
      text: `Rio de Janeiro, ${currentDate}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({
      text: '________________________________________',
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [new TextRun({ text: 'Assinatura do Responsável', bold: true, font: 'Times New Roman', size: 24 })],
    }),
    new Paragraph({
      text: project.organizationName,
      alignment: AlignmentType.CENTER,
    }),
    // Audit trail
    new Paragraph({ text: '', spacing: { after: 600 } }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [new TextRun({
        text: `Documento gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)`,
        font: 'Times New Roman',
        size: 14,
        color: '9CA3AF',
        italics: true,
      })],
    })
  );

  // Create the document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 24, // 12pt
          },
          paragraph: {
            spacing: { line: 360 }, // 1.5 line spacing
            indent: { firstLine: 709 }, // 1.25cm
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            font: 'Times New Roman',
            size: 28,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
            outlineLevel: 0,
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            font: 'Times New Roman',
            size: 26,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
            outlineLevel: 1,
          },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            font: 'Times New Roman',
            size: 24,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
            outlineLevel: 2,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: 16838,
            },
            margin: {
              top: 1701,   // 3cm
              right: MARGIN_RIGHT,
              bottom: 1134, // 2cm
              left: MARGIN_LEFT,
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
                const CEAP_L1 = 'Centro de Articulação de Populações Marginalizadas - CEAP';
                const CEAP_L2 = 'R. Sr. dos Passos, 174 - Sl 701 - Centro, Rio de Janeiro - RJ, 20061-011';
                const CEAP_L3 = 'ceapoficial.org.br | falecom@ceapoficial.org.br | (21) 9 7286-4717';

                const l1Text = vc?.footerLine1Text || CEAP_L1;
                const l1Size = Math.round((vc?.footerLine1FontSize ?? 9) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [new TextRun({ text: l1Text, size: l1Size, font: 'Times New Roman', bold: true })],
                }));

                const l2Text = vc?.footerLine2Text || CEAP_L2;
                const l2Size = Math.round((vc?.footerLine2FontSize ?? 7) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [new TextRun({ text: l2Text, size: l2Size, font: 'Times New Roman' })],
                }));

                const l3Text = vc?.footerLine3Text || CEAP_L3;
                const l3Size = Math.round((vc?.footerLine3FontSize ?? 7) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [new TextRun({ text: l3Text, size: l3Size, font: 'Times New Roman' })],
                }));
              }

              const customText = vc?.footerText;
              if (customText) {
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [new TextRun({ text: customText, size: 14, font: 'Times New Roman', italics: true })],
                }));
              }

              // Page numbers
              children.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({ size: 16, font: 'Times New Roman', color: '9CA3AF', children: [PageNumber.CURRENT] }),
                  new TextRun({ text: ' / ', size: 16, font: 'Times New Roman', color: '9CA3AF' }),
                  new TextRun({ size: 16, font: 'Times New Roman', color: '9CA3AF', children: [PageNumber.TOTAL_PAGES] }),
                ],
              }));

              return children;
            })(),
          }),
        },
        children: docSections as Paragraph[],
      },
    ],
  });

  // Generate and save the file
  const blob = await Packer.toBlob(doc);
  const filename = `Relatorio_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, filename);
};
