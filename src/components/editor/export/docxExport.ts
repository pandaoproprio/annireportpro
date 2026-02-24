import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  SectionType,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  DocumentModel,
  DocumentBlock,
  TextBlock,
  ImageBlock,
  TableBlock,
  SpacerBlock,
  HeaderFooterConfig,
  LayoutConfig,
} from '@/types/document';
import {
  StructuredRichContent,
  RichTextParagraph,
  RichTextSpan,
  RichTextVariable,
  resolveVariable,
} from '@/types/richText';

// ── mm → twips (1mm = 56.693 twips) ──
const mmToTwips = (v: number) => Math.round(v * 56.693);
const ptToHalfPt = (v: number) => v * 2;

// ── Parse HTML to text runs ──
interface StyledRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

const parseHtmlToRuns = (html: string): StyledRun[] => {
  if (!html) return [{ text: '', bold: false, italic: false, underline: false }];

  const runs: StyledRun[] = [];
  let bold = false, italic = false, underline = false;

  const parts = html.split(/(<\/?(?:strong|b|em|i|u|br|p)[^>]*>)/gi);

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === '<strong>' || lower === '<b>') { bold = true; continue; }
    if (lower === '</strong>' || lower === '</b>') { bold = false; continue; }
    if (lower === '<em>' || lower === '<i>') { italic = true; continue; }
    if (lower === '</em>' || lower === '</i>') { italic = false; continue; }
    if (lower === '<u>') { underline = true; continue; }
    if (lower === '</u>') { underline = false; continue; }
    if (lower.startsWith('<br')) { runs.push({ text: '\n', bold, italic, underline }); continue; }
    if (lower.startsWith('<p') || lower === '</p>') continue;

    const cleaned = part.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    if (cleaned) {
      runs.push({ text: cleaned, bold, italic, underline });
    }
  }

  return runs.length > 0 ? runs : [{ text: '', bold: false, italic: false, underline: false }];
};

const alignmentMap: Record<string, typeof AlignmentType[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

// ── Block converters ──
const textBlockToParagraphs = (block: TextBlock): Paragraph[] => {
  const runs = parseHtmlToRuns(block.content);

  // Split by newlines to create separate paragraphs
  const groups: StyledRun[][] = [[]];
  for (const run of runs) {
    if (run.text === '\n') {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(run);
    }
  }

  return groups.map(group => new Paragraph({
    alignment: alignmentMap[block.alignment] || AlignmentType.JUSTIFIED,
    spacing: {
      before: mmToTwips(block.marginTop),
      after: mmToTwips(block.marginBottom),
      line: Math.round(block.lineHeight * 240),
    },
    children: group.map(r => new TextRun({
      text: r.text,
      bold: r.bold || block.bold,
      italics: r.italic || block.italic,
      underline: r.underline || block.underline ? { type: 'single' as any } : undefined,
      size: ptToHalfPt(block.fontSize),
      font: block.fontFamily,
      color: block.color.replace('#', ''),
    })),
  }));
};

const imageBlockToParagraphs = async (block: ImageBlock): Promise<Paragraph[]> => {
  if (!block.src) return [];

  try {
    const response = await fetch(block.src);
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // mm to EMU (1mm = 36000 EMU)
    const widthEmu = Math.round(block.displayWidth * 36000);
    const heightEmu = Math.round(block.displayHeight * 36000);

    const paragraphs: Paragraph[] = [
      new Paragraph({
        alignment: alignmentMap[block.alignment] || AlignmentType.CENTER,
        spacing: {
          before: mmToTwips(block.marginTop),
          after: block.caption ? 0 : mmToTwips(block.marginBottom),
        },
        children: [
          new ImageRun({
            data: uint8,
            transformation: {
              width: widthEmu / 914.4,
              height: heightEmu / 914.4,
            },
          }),
        ],
      }),
    ];

    if (block.caption) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: mmToTwips(block.marginBottom) },
        children: [
          new TextRun({
            text: block.caption,
            size: 18, // 9pt
            color: '666666',
            italics: true,
          }),
        ],
      }));
    }

    return paragraphs;
  } catch (e) {
    console.error('Failed to embed image in DOCX:', e);
    return [new Paragraph({
      children: [new TextRun({ text: '[Imagem não disponível]', italics: true, color: '999999' })],
    })];
  }
};

const tableBlockToTable = (block: TableBlock): Table => {
  const borderConfig = {
    style: BorderStyle.SINGLE,
    size: block.borderWidth > 0 ? block.borderWidth * 2 : 1,
    color: block.borderColor.replace('#', '') || '999999',
  };

  return new Table({
    width: { size: block.width, type: WidthType.PERCENTAGE },
    rows: block.data.map((row, ri) =>
      new TableRow({
        children: row.map((cell, ci) =>
          new TableCell({
            width: { size: block.colWidths[ci] || (100 / block.cols), type: WidthType.PERCENTAGE },
            borders: {
              top: borderConfig,
              bottom: borderConfig,
              left: borderConfig,
              right: borderConfig,
            },
            shading: block.headerRow && ri === 0 ? { fill: 'f0f0f0' } : undefined,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell,
                    bold: block.headerRow && ri === 0,
                    size: 20, // 10pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          })
        ),
      })
    ),
  });
};

const spacerBlockToParagraph = (block: SpacerBlock): Paragraph => {
  return new Paragraph({
    spacing: {
      before: mmToTwips(block.marginTop + block.height),
      after: mmToTwips(block.marginBottom),
    },
    children: [new TextRun({ text: '' })],
  });
};

// ── Build header/footer ──
const stripHtml = (html: string): string =>
  (html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

// ── Build structured content paragraphs for DOCX ──
const buildStructuredParagraphs = (
  content: StructuredRichContent,
  config: HeaderFooterConfig,
  title: string,
): Paragraph[] => {
  return content.content
    .filter((n): n is RichTextParagraph => n.type === 'paragraph')
    .map(para => {
      const runs: TextRun[] = para.children.map(child => {
        if ('variable' in child && child.type === 'variable') {
          const varChild = child as RichTextVariable;
          if (varChild.variable === 'pageNumber') {
            return new TextRun({
              children: [PageNumber.CURRENT],
              bold: varChild.bold,
              italics: varChild.italic,
              size: ptToHalfPt(varChild.fontSize ?? config.fontSize),
              font: varChild.fontFamily ?? config.fontFamily,
            });
          }
          if (varChild.variable === 'totalPages') {
            return new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              bold: varChild.bold,
              italics: varChild.italic,
              size: ptToHalfPt(varChild.fontSize ?? config.fontSize),
              font: varChild.fontFamily ?? config.fontFamily,
            });
          }
          const resolved = resolveVariable(varChild.variable, { title });
          return new TextRun({
            text: resolved,
            bold: varChild.bold,
            italics: varChild.italic,
            size: ptToHalfPt(varChild.fontSize ?? config.fontSize),
            font: varChild.fontFamily ?? config.fontFamily,
          });
        }
        const span = child as RichTextSpan;
        return new TextRun({
          text: span.text,
          bold: span.bold,
          italics: span.italic,
          underline: span.underline ? { type: 'single' as any } : undefined,
          size: ptToHalfPt(span.fontSize ?? config.fontSize),
          font: span.fontFamily ?? config.fontFamily,
          ...(span.color ? { color: span.color.replace('#', '') } : {}),
        });
      });

      return new Paragraph({
        alignment: alignmentMap[para.align] || AlignmentType.CENTER,
        children: runs,
      });
    });
};

const buildHeader = (config: HeaderFooterConfig, title: string): Header | undefined => {
  if (!config.enabled) return undefined;

  if (config.structuredContent) {
    return new Header({
      children: buildStructuredParagraphs(config.structuredContent, config, title),
    });
  }

  const text = stripHtml(config.content);
  return new Header({
    children: [
      new Paragraph({
        alignment: alignmentMap[config.alignment] || AlignmentType.CENTER,
        children: text ? [
          new TextRun({
            text,
            size: ptToHalfPt(config.fontSize),
            font: config.fontFamily,
          }),
        ] : [],
      }),
    ],
  });
};

const buildFooter = (config: HeaderFooterConfig, title: string): Footer | undefined => {
  if (!config.enabled) return undefined;

  if (config.structuredContent) {
    return new Footer({
      children: buildStructuredParagraphs(config.structuredContent, config, title),
    });
  }

  const text = stripHtml(config.content);
  return new Footer({
    children: [
      new Paragraph({
        alignment: alignmentMap[config.alignment] || AlignmentType.CENTER,
        children: [
          ...(text ? [new TextRun({ text: text + '  —  ', size: ptToHalfPt(config.fontSize), font: config.fontFamily })] : []),
          new TextRun({ children: [PageNumber.CURRENT], size: ptToHalfPt(config.fontSize) }),
          new TextRun({ text: ' / ', size: ptToHalfPt(config.fontSize) }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: ptToHalfPt(config.fontSize) }),
        ],
      }),
    ],
  });
};

// ── Main export ──
export const generateDocx = async (model: DocumentModel, title: string) => {
  const { layout, globalHeader, globalFooter } = model;

  // Process all blocks from all pages
  const allChildren: (Paragraph | Table)[] = [];

  for (let pi = 0; pi < model.pages.length; pi++) {
    const page = model.pages[pi];

    // Page break before non-first pages
    if (pi > 0) {
      allChildren.push(new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
        pageBreakBefore: true,
      }));
    }

    for (const block of page.blocks) {
      switch (block.type) {
        case 'text':
          allChildren.push(...textBlockToParagraphs(block));
          break;
        case 'image':
          allChildren.push(...(await imageBlockToParagraphs(block)));
          break;
        case 'table':
          allChildren.push(tableBlockToTable(block));
          break;
        case 'spacer':
          allChildren.push(spacerBlockToParagraph(block));
          break;
      }
    }
  }

  // Use first page header/footer config (or global)
  const headerConfig = model.pages[0]?.header ?? globalHeader;
  const footerConfig = model.pages[0]?.footer ?? globalFooter;

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: mmToTwips(layout.pageWidth),
            height: mmToTwips(layout.pageHeight),
          },
          margin: {
            top: mmToTwips(layout.marginTop + (headerConfig.enabled ? headerConfig.height + layout.headerSpacing : 0)),
            bottom: mmToTwips(layout.marginBottom + (footerConfig.enabled ? footerConfig.height + layout.footerSpacing : 0)),
            left: mmToTwips(layout.marginLeft),
            right: mmToTwips(layout.marginRight),
          },
        },
        
      },
      headers: {
        default: buildHeader(headerConfig, title),
      },
      footers: {
        default: buildFooter(footerConfig, title),
      },
      children: allChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${title.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').trim() || 'documento'}.docx`;
  saveAs(blob, filename);
};
