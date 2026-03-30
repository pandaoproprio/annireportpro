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
  NumberFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import { Project, Activity, ActivityType, ExpenseItem, ReportSection, PhotoGroup } from '@/types';
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
  photoMetadata?: Record<string, any[]>;
  sectionPhotoGroups?: Record<string, PhotoGroup[]>;
}

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

  // If no HTML tags, return plain text
  if (!/[<][a-z!/]/i.test(html)) {
    return [new TextRun({ text: html.trim(), font: 'Times New Roman', size: 24 })];
  }

  const runs: TextRun[] = [];
  // Simple state-based parser for bold/italic/underline
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n');

  // Match segments with inline formatting
  const regex = /<(strong|b|em|i|u)>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
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

  // Remaining text
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

  // If it contains HTML, parse it
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

  // Plain text fallback
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

// Legacy alias
const textToParagraphs = richTextToParagraphs;

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
      text: '',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: project.organizationName, bold: true, size: 28, font: 'Times New Roman' })],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Process each visible section
  for (const section of sections) {
    if (!section.isVisible) continue;

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
                  text: `• ${formatActivityDate(act.date, act.endDate)}${act.location ? ` – ${act.location}` : ''}${act.attendeesCount > 0 ? ` – ${act.attendeesCount} participantes` : ''}`,
                  spacing: { after: 50 },
                  indent: { left: 400 },
                }),
                new Paragraph({
                  text: act.description,
                  spacing: { after: 100 },
                  indent: { left: 400 },
                })
              );
            }
          }
        }
        break;

      case 'other':
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
                text: `• ${formatActivityDate(act.date)}: ${act.description}`,
                spacing: { after: 50 },
                indent: { left: 400 },
              })
            );
          }
        }
        break;

      case 'communication':
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
                text: `• ${formatActivityDate(act.date)}: ${act.description}`,
                spacing: { after: 50 },
                indent: { left: 400 },
              })
            );
          }
        }
        break;

      case 'satisfaction':
        docSections.push(...textToParagraphs(satisfaction || '[Grau de satisfação do público-alvo]'));
        break;

      case 'future':
        docSections.push(...textToParagraphs(futureActions || '[Sobre as ações futuras]'));
        break;

      case 'expenses':
        if (expenses.length > 0) {
          const expenseTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Item de Despesa', alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E0E0E0' },
                    width: { size: 24, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: 'Descrição de Uso', alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E0E0E0' },
                    width: { size: 46, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: 'Registro Fotográfico', alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E0E0E0' },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              ...expenses.map(
                expense => {
                  const hasPhoto = expense.image || (expense as any).fotos || (expense as any).photos;
                  return new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: expense.itemName || '-' })],
                        width: { size: 24, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: expense.description || '-' })],
                        width: { size: 46, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({
                          text: hasPhoto ? '[Ver registro fotográfico no PDF]' : 'Sem foto',
                          alignment: AlignmentType.CENTER,
                        })],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  });
                }
              ),
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

      case 'links':
        const dn = data.linkDisplayNames || { attendance: '', registration: '', media: '' };
        docSections.push(
          new Paragraph({
            text: `Lista de Presença: ${dn.attendance || links.attendance || '[não informado]'}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Lista de Inscrição: ${dn.registration || links.registration || '[não informado]'}`,
            spacing: { after: 100 },
          }),
           );

          // Only render media section if there's actual content
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
                  text: `Mídias (Fotos/Vídeos): ${dn.media || uniqueMediaUrls[0] || ''}`,
                  spacing: { after: 200 },
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

      default:
        if (section.type === 'custom' && section.content) {
          docSections.push(...textToParagraphs(section.content));
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
      text: '',
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [new TextRun({ text: 'Assinatura do Responsável', bold: true, font: 'Times New Roman', size: 24 })],
    }),
    new Paragraph({
      text: project.organizationName,
      alignment: AlignmentType.CENTER,
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
          run: {
            font: 'Times New Roman',
            size: 28,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Times New Roman',
            size: 26,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Times New Roman',
            size: 24,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1701,   // 3cm
              right: 1134, // 2cm
              bottom: 1134, // 2cm
              left: 1701,  // 3cm
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

                // Line 1 (bold)
                const l1Text = vc?.footerLine1Text || CEAP_L1;
                const l1Size = Math.round((vc?.footerLine1FontSize ?? 9) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [new TextRun({ text: l1Text, size: l1Size, font: 'Times New Roman', bold: true })],
                }));

                // Line 2 (normal)
                const l2Text = vc?.footerLine2Text || CEAP_L2;
                const l2Size = Math.round((vc?.footerLine2FontSize ?? 7) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [new TextRun({ text: l2Text, size: l2Size, font: 'Times New Roman' })],
                }));

                // Line 3 (normal)
                const l3Text = vc?.footerLine3Text || CEAP_L3;
                const l3Size = Math.round((vc?.footerLine3FontSize ?? 7) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [new TextRun({ text: l3Text, size: l3Size, font: 'Times New Roman' })],
                }));
              }

              // Custom text (italic)
              const customText = vc?.footerText;
              if (customText) {
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [new TextRun({ text: customText, size: 14, font: 'Times New Roman', italics: true })],
                }));
              }

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
