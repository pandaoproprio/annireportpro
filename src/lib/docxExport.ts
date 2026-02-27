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
import { Project, Activity, ActivityType, ExpenseItem, ReportSection } from '@/types';
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
}

const formatActivityDate = (date: string, endDate?: string) => {
  const start = new Date(date).toLocaleDateString('pt-BR');
  if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
  return start;
};

// Helper: split text by \n into multiple ABNT-formatted paragraphs
const textToParagraphs = (
  text: string,
  options?: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean }
): Paragraph[] => {
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
    activities.filter(a => a.goalId === goalId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCommunicationActivities = () =>
    activities.filter(a => a.type === ActivityType.COMUNICACAO).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOtherActivities = () =>
    activities.filter(a => a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO || a.type === ActivityType.OCORRENCIA)
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
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: 'Descrição de Uso', alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E0E0E0' },
                  }),
                ],
              }),
              ...expenses.map(
                expense =>
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: expense.itemName || '-' })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: expense.description || '-' })],
                      }),
                    ],
                  })
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
          new Paragraph({
            text: `Mídias (Fotos/Vídeos): ${dn.media || links.media || '[não informado]'}`,
            spacing: { after: 200 },
          })
          );

          // Render media links — may contain multiple URLs (one per line)
          if (!dn.media) {
            const mediaText = links.media || '[não informado]';
            const mediaUrls = mediaText.split('\n').filter(l => l.trim());
            if (mediaUrls.length > 1) {
              // Remove the single-line version already pushed above, re-add with multiple lines
              docSections.pop(); // remove the single Mídias paragraph
              docSections.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: 'Mídias (Fotos/Vídeos):', bold: true, font: 'Times New Roman', size: 24 })],
                })
              );
              for (const mUrl of mediaUrls) {
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
                // Line 1 (bold)
                const l1Text = vc?.footerLine1Text || project.organizationName;
                const l1Size = Math.round((vc?.footerLine1FontSize ?? 9) * 2);
                children.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [new TextRun({ text: l1Text, size: l1Size, font: 'Times New Roman', bold: true })],
                }));

                // Line 2 (normal)
                if (vc?.footerLine2Text) {
                  const l2Size = Math.round((vc.footerLine2FontSize ?? 7) * 2);
                  children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 20 },
                    children: [new TextRun({ text: vc.footerLine2Text, size: l2Size, font: 'Times New Roman' })],
                  }));
                }

                // Line 3 (normal)
                if (vc?.footerLine3Text) {
                  const l3Size = Math.round((vc.footerLine3FontSize ?? 7) * 2);
                  children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 20 },
                    children: [new TextRun({ text: vc.footerLine3Text, size: l3Size, font: 'Times New Roman' })],
                  }));
                }
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
