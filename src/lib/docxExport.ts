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
}

const formatActivityDate = (date: string, endDate?: string) => {
  const start = new Date(date).toLocaleDateString('pt-BR');
  if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
  return start;
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
  } = data;

  const getActivitiesByGoal = (goalId: string) =>
    activities.filter(a => a.goalId === goalId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCommunicationActivities = () =>
    activities.filter(a => a.type === ActivityType.COMUNICACAO).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOtherActivities = () =>
    activities.filter(a => a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO || a.type === ActivityType.OCORRENCIA)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build document sections
  const docSections: Paragraph[] = [];

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
      text: project.organizationName,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: project.organizationName, bold: true, size: 28 })],
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
        docSections.push(
          new Paragraph({
            text: objectText || '[Descrição do objeto]',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          })
        );
        break;

      case 'summary':
        docSections.push(
          new Paragraph({
            text: summary || '[Resumo das atividades]',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          })
        );
        break;

      case 'goals':
        for (let idx = 0; idx < project.goals.length; idx++) {
          const goal = project.goals[idx];
          const goalActs = getActivitiesByGoal(goal.id);

          docSections.push(
            new Paragraph({
              text: `META ${idx + 1} – ${goal.title}`,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 200 },
            }),
            new Paragraph({
              text: goalNarratives[goal.id] || '[Descreva as realizações da meta]',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 200 },
            })
          );

          if (goalActs.length > 0) {
            docSections.push(
              new Paragraph({
                text: 'Atividades realizadas:',
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: 'Atividades realizadas:', bold: true })],
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
        docSections.push(
          new Paragraph({
            text: otherActionsNarrative || '[Outras informações sobre as ações desenvolvidas]',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          })
        );

        if (otherActs.length > 0) {
          docSections.push(
            new Paragraph({
              text: 'Atividades relacionadas:',
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: 'Atividades relacionadas:', bold: true })],
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
        docSections.push(
          new Paragraph({
            text: communicationNarrative || '[Publicações e ações de divulgação]',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          })
        );

        if (commActs.length > 0) {
          docSections.push(
            new Paragraph({
              text: 'Atividades de divulgação:',
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: 'Atividades de divulgação:', bold: true })],
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
        docSections.push(
          new Paragraph({
            text: satisfaction || '[Grau de satisfação do público-alvo]',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          })
        );
        break;

      case 'future':
        docSections.push(
          new Paragraph({
            text: futureActions || '[Sobre as ações futuras]',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          })
        );
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
          docSections.push(expenseTable as unknown as Paragraph);
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
        docSections.push(
          new Paragraph({
            text: `Lista de Presença: ${links.attendance || '[não informado]'}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Lista de Inscrição: ${links.registration || '[não informado]'}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Mídias (Fotos/Vídeos): ${links.media || '[não informado]'}`,
            spacing: { after: 200 },
          })
        );
        break;

      default:
        if (section.type === 'custom' && section.content) {
          docSections.push(
            new Paragraph({
              text: section.content,
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 200 },
            })
          );
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
      text: 'Assinatura do Responsável',
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [new TextRun({ text: 'Assinatura do Responsável', bold: true })],
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
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: project.organizationName, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ', size: 18 }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                  }),
                  new TextRun({ text: ' de ', size: 18 }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        children: docSections,
      },
    ],
  });

  // Generate and save the file
  const blob = await Packer.toBlob(doc);
  const filename = `Relatorio_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, filename);
};
